import fs from 'fs';
import XLSX from 'xlsx';
import { query } from '../config/database.js';

const importInvoices = async (filePath) => {
  try {
    console.log('📂 Reading Excel file...');

    // Read the Excel file
    const workbook = XLSX.readFile(filePath);

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const records = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${records.length} invoices to import`);
    console.log(`📋 Available columns: ${Object.keys(records[0] || {}).join(', ')}`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of records) {
      try {
        // Map QuickBooks Excel columns to database fields
        // Format: Name, Date, Transaction Type, Number, Description, Due date, Amount, Open balance, Job Name
        const invoiceNumber = record['Number'] || record['Num'] || record['Invoice Number'] || record['DocNumber'];
        const customerName = record['Name'] || record['Customer'] || record['Customer Name'];
        const invoiceDate = record['Date'] || record['Invoice Date'] || record['TxnDate'];
        const dueDate = record['Due date'] || record['Due Date'] || record['DueDate'];
        const total = parseFloat(record['Amount'] || record['Total'] || 0);
        const openBalance = parseFloat(record['Open balance'] || record['Open Balance'] || record['Balance'] || 0);
        const description = record['Description'] || record['Memo'] || '';
        const jobName = record['Job Name'] || record['Job'] || null;
        const title = `Invoice ${invoiceNumber}`;

        // Determine status based on open balance
        let status = 'unpaid';
        let paidDate = null;
        if (openBalance === 0) {
          status = 'paid';
          // If paid, we don't have exact paid date, so use invoice date as approximation
          paidDate = invoiceDate;
        } else if (openBalance < total && openBalance > 0) {
          status = 'partial';
        }

        // No tax breakdown available in this export, so subtotal = total
        const subtotal = total;
        const taxAmount = 0;

        if (!invoiceNumber) {
          console.log(`⚠️  Skipping row - no invoice number found. Available columns: ${Object.keys(record).join(', ')}`);
          skipped++;
          continue;
        }

        if (!customerName) {
          console.log(`⚠️  Skipping invoice ${invoiceNumber} - no customer name found`);
          skipped++;
          continue;
        }

        // Check if invoice already exists
        const existingInvoice = await query(
          'SELECT id FROM invoices WHERE invoice_number = $1',
          [invoiceNumber.toString()]
        );

        if (existingInvoice.rows.length > 0) {
          console.log(`⏭️  Skipping invoice ${invoiceNumber} - already exists`);
          skipped++;
          continue;
        }

        // Find customer by name (case-insensitive)
        const customerResult = await query(
          'SELECT id FROM customers WHERE name ILIKE $1 OR company_name ILIKE $1',
          [customerName.trim()]
        );

        if (customerResult.rows.length === 0) {
          console.log(`⚠️  Skipping invoice ${invoiceNumber} - customer "${customerName}" not found`);
          console.log(`   💡 Tip: Import customers first or check customer name spelling`);
          skipped++;
          continue;
        }

        const customerId = customerResult.rows[0].id;

        // Try to find matching job by name
        let jobId = null;
        if (jobName) {
          const jobResult = await query(
            'SELECT id FROM jobs WHERE title ILIKE $1 AND customer_id = $2',
            [jobName.trim(), customerId]
          );

          if (jobResult.rows.length > 0) {
            jobId = jobResult.rows[0].id;
            console.log(`   🔗 Linked to job: ${jobName}`);
          }
        }

        // No line items data available in this export format
        // New invoices created in the system will have proper line items
        const lineItems = [];

        // Parse date strings to proper format
        let parsedInvoiceDate = null;
        if (invoiceDate) {
          try {
            parsedInvoiceDate = new Date(invoiceDate);
            if (isNaN(parsedInvoiceDate)) {
              parsedInvoiceDate = new Date();
            }
          } catch {
            parsedInvoiceDate = new Date();
          }
        } else {
          parsedInvoiceDate = new Date();
        }

        let parsedDueDate = null;
        if (dueDate) {
          try {
            parsedDueDate = new Date(dueDate);
            if (isNaN(parsedDueDate)) {
              parsedDueDate = null;
            }
          } catch {
            parsedDueDate = null;
          }
        }

        let parsedPaidDate = null;
        if (paidDate) {
          try {
            parsedPaidDate = new Date(paidDate);
            if (isNaN(parsedPaidDate)) {
              parsedPaidDate = null;
            }
          } catch {
            parsedPaidDate = null;
          }
        }

        // Insert invoice
        await query(
          `INSERT INTO invoices (
            customer_id,
            job_id,
            invoice_number,
            title,
            description,
            line_items,
            subtotal,
            tax,
            total,
            due_date,
            paid_date,
            status,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            customerId,
            jobId,
            invoiceNumber.toString(),
            title,
            description || null,
            JSON.stringify(lineItems),
            subtotal || 0,
            taxAmount || 0,
            total || 0,
            parsedDueDate,
            parsedPaidDate,
            status,
            parsedInvoiceDate
          ]
        );

        console.log(`✅ Imported: Invoice ${invoiceNumber} for ${customerName} ($${(total || 0).toFixed(2)}) - ${status}`);
        imported++;
      } catch (error) {
        console.error(`❌ Error importing invoice:`, error.message);
        console.error(`   Row data:`, JSON.stringify(record, null, 2));
        errors++;
      }
    }

    console.log('\n📈 Import Summary:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total: ${records.length}`);

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
  console.log('Usage: node scripts/import-invoices-xls.js /path/to/invoices.xlsx');
  console.log('\nHow to export from QuickBooks:');
  console.log('1. Go to Sales > Invoices');
  console.log('2. Click "Export" or use Reports > Transaction List by Customer');
  console.log('3. Filter to show only invoices');
  console.log('4. Export as Excel (.xlsx or .xls)');
  console.log('5. Run this script with the exported Excel file');
  console.log('\n💡 Tips:');
  console.log('- Make sure customers are imported first');
  console.log('- Customer names must match exactly (case-insensitive)');
  console.log('- Invoice numbers must be unique');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

importInvoices(filePath);
