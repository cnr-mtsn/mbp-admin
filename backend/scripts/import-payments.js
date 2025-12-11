import fs from 'fs';
import XLSX from 'xlsx';
import { query } from '../config/database.js';

const importPayments = async (filePath) => {
  try {
    console.log('📂 Reading Excel file...');

    // Read the Excel file
    const workbook = XLSX.readFile(filePath);

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const records = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${records.length} rows to process`);
    if (records.length > 0) {
      console.log(`📋 Available columns: ${Object.keys(records[0] || {}).join(', ')}`);
    }

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Group rows into payments with their invoices
    const payments = [];
    let currentPayment = null;

    for (const record of records) {
      const transactionType = record['Transaction Type'] || record['Type'];

      if (transactionType === 'Payment') {
        // Start a new payment
        if (currentPayment) {
          payments.push(currentPayment);
        }

        currentPayment = {
          date: record['Date'],
          customer: record['Customer'],
          paymentMethod: record['Payment Method'] || 'Unknown',
          totalAmount: parseFloat(record['Amount '] || record['Amount']) || 0,
          invoices: []
        };
      } else if (transactionType === 'Invoice' && currentPayment) {
        // Add invoice to current payment
        currentPayment.invoices.push({
          invoiceNumber: record['Invoice Number'] || record['Num'] || record['Number'],
          amount: parseFloat(record['Amount '] || record['Amount']) || 0
        });
      }
    }

    // Don't forget the last payment
    if (currentPayment) {
      payments.push(currentPayment);
    }

    console.log(`\n💰 Found ${payments.length} payments to import`);

    // Process each payment
    for (const paymentData of payments) {
      try {
        const { date, customer, paymentMethod, totalAmount, invoices } = paymentData;

        // Validate required fields
        if (!customer) {
          console.log(`⚠️  Skipping payment - no customer name found`);
          skipped++;
          continue;
        }

        if (!paymentMethod) {
          console.log(`⚠️  Skipping payment for ${customer} - no payment method found`);
          skipped++;
          continue;
        }

        if (invoices.length === 0) {
          console.log(`⚠️  Skipping payment for ${customer} - no invoices linked`);
          skipped++;
          continue;
        }

        // Find customer by name (case-insensitive)
        const customerResult = await query(
          'SELECT id FROM customers WHERE name ILIKE $1 OR company_name ILIKE $1',
          [customer.trim()]
        );

        if (customerResult.rows.length === 0) {
          console.log(`⚠️  Skipping payment - customer "${customer}" not found`);
          console.log(`   💡 Tip: Import customers first or check customer name spelling`);
          skipped++;
          continue;
        }

        const customerId = customerResult.rows[0].id;

        // Parse payment date
        let parsedDate = null;
        if (date) {
          try {
            parsedDate = new Date(date);
            if (isNaN(parsedDate)) {
              parsedDate = new Date();
            }
          } catch {
            parsedDate = new Date();
          }
        } else {
          parsedDate = new Date();
        }

        // Find all invoice IDs and validate amounts
        const invoiceDetails = [];
        let totalApplied = 0;
        let allInvoicesFound = true;

        for (const inv of invoices) {
          if (!inv.invoiceNumber) {
            console.log(`   ⚠️  Skipping invoice with no number in payment for ${customer}`);
            continue;
          }

          const invoiceResult = await query(
            'SELECT id, invoice_number, total FROM invoices WHERE invoice_number = $1 AND customer_id = $2',
            [inv.invoiceNumber.toString(), customerId]
          );

          if (invoiceResult.rows.length === 0) {
            console.log(`   ⚠️  Invoice ${inv.invoiceNumber} not found for customer ${customer}`);
            allInvoicesFound = false;
            break;
          }

          const invoiceId = invoiceResult.rows[0].id;
          const invoiceTotal = parseFloat(invoiceResult.rows[0].total);
          const amountApplied = inv.amount;

          // Validate amount doesn't exceed invoice total
          if (amountApplied > invoiceTotal + 0.01) {
            console.log(`   ⚠️  Amount applied ($${amountApplied}) exceeds invoice total ($${invoiceTotal}) for invoice ${inv.invoiceNumber}`);
            allInvoicesFound = false;
            break;
          }

          invoiceDetails.push({
            invoiceId,
            invoiceNumber: inv.invoiceNumber,
            amountApplied
          });
          totalApplied += amountApplied;
        }

        if (!allInvoicesFound || invoiceDetails.length === 0) {
          console.log(`⚠️  Skipping payment for ${customer} - not all invoices found`);
          skipped++;
          continue;
        }

        // Check if total applied matches payment amount (within a small margin for rounding)
        if (Math.abs(totalApplied - totalAmount) > 0.01) {
          console.log(`⚠️  Warning: Total applied ($${totalApplied.toFixed(2)}) doesn't match payment amount ($${totalAmount.toFixed(2)}) for ${customer}`);
          console.log(`   Proceeding with actual invoice amounts...`);
        }

        // Check if this payment already exists (based on customer, date, and amount)
        const existingPayment = await query(
          `SELECT id FROM payments
           WHERE customer_id = $1
           AND payment_date::date = $2::date
           AND ABS(total_amount - $3) < 0.01`,
          [customerId, parsedDate, totalAmount]
        );

        if (existingPayment.rows.length > 0) {
          console.log(`⏭️  Skipping payment for ${customer} on ${parsedDate.toLocaleDateString()} - already exists`);
          skipped++;
          continue;
        }

        // Create payment record
        const paymentResult = await query(
          `INSERT INTO payments (customer_id, payment_method, total_amount, payment_date)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [customerId, paymentMethod, totalApplied, parsedDate]
        );

        const paymentId = paymentResult.rows[0].id;

        // Create payment_invoices records
        for (const inv of invoiceDetails) {
          await query(
            `INSERT INTO payment_invoices (payment_id, invoice_id, amount_applied)
             VALUES ($1, $2, $3)`,
            [paymentId, inv.invoiceId, inv.amountApplied]
          );
        }

        // Recalculate invoice statuses
        for (const inv of invoiceDetails) {
          const invoiceId = inv.invoiceId;

          // Get invoice details
          const invoiceResult = await query(
            `SELECT id, total, due_date, payment_method, status, job_id
             FROM invoices
             WHERE id = $1`,
            [invoiceId]
          );

          if (invoiceResult.rows.length === 0) continue;

          const invoice = invoiceResult.rows[0];

          // Calculate total payments applied to this invoice
          const paymentAgg = await query(
            `SELECT
                COALESCE(SUM(pi.amount_applied), 0) as total_applied,
                MAX(p.payment_date) as last_payment_date,
                (ARRAY_AGG(p.payment_method ORDER BY p.payment_date DESC))[1] as last_payment_method
             FROM payment_invoices pi
             JOIN payments p ON pi.payment_id = p.id
             WHERE pi.invoice_id = $1`,
            [invoiceId]
          );

          const aggregation = paymentAgg.rows[0];
          const totalPaid = parseFloat(aggregation.total_applied) || 0;
          const isPaid = totalPaid >= parseFloat(invoice.total) - 0.01;
          const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date();

          let status = isPaid ? 'paid' : (isOverdue ? 'overdue' : 'sent');
          let paidDate = isPaid ? aggregation.last_payment_date || invoice.due_date : null;
          let paymentMethodFinal = isPaid ? aggregation.last_payment_method || invoice.payment_method : null;

          await query(
            `UPDATE invoices
             SET status = $1,
                 paid_date = $2,
                 payment_method = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [status, paidDate, paymentMethodFinal, invoiceId]
          );

          // Update job status if invoice is linked to a job
          if (invoice.job_id) {
            const jobStats = await query(
              `SELECT COUNT(*) as total_invoices,
                      COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices
               FROM invoices
               WHERE job_id = $1`,
              [invoice.job_id]
            );

            const { total_invoices, paid_invoices } = jobStats.rows[0];
            const hasInvoices = parseInt(total_invoices) > 0;
            const allPaid = hasInvoices && parseInt(total_invoices) === parseInt(paid_invoices);

            await query(
              `UPDATE jobs
               SET status = CASE
                 WHEN $2 THEN 'paid'
                 WHEN status = 'paid' THEN 'in_progress'
                 ELSE status
               END,
               updated_at = NOW()
               WHERE id = $1`,
              [invoice.job_id, allPaid]
            );
          }
        }

        const invoiceNumbers = invoiceDetails.map(i => i.invoiceNumber).join(', ');
        console.log(`✅ Imported: Payment for ${customer} - $${totalApplied.toFixed(2)} (${paymentMethod}) - Invoices: ${invoiceNumbers}`);
        imported++;
      } catch (error) {
        console.error(`❌ Error importing payment:`, error.message);
        console.error(`   Payment data:`, JSON.stringify(paymentData, null, 2));
        errors++;
      }
    }

    console.log('\n📈 Import Summary:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total payments: ${payments.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
};

// Get file path from command line argument
const filePath = process.argv[2];

if (!filePath) {
  console.error('❌ Please provide an Excel file path');
  console.log('Usage: node scripts/import-payments.js /path/to/payments.xlsx');
  console.log('\nExpected Excel format:');
  console.log('- Columns: Date, Transaction Type, Invoice Number, Amount, Customer, Payment Method');
  console.log('- Payment row (Transaction Type = "Payment") followed by invoice rows (Transaction Type = "Invoice")');
  console.log('- Each payment can have multiple invoices applied to it');
  console.log('\n💡 Tips:');
  console.log('- Make sure customers and invoices are imported first');
  console.log('- Customer names and invoice numbers must match existing records');
  console.log('- Payment amounts will be validated against invoice totals');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

importPayments(filePath);
