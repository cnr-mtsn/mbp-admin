import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { query } from '../config/database.js';

const importInvoices = async (csvFilePath) => {
  try {
    console.log('📂 Reading CSV file...');

    // Read the CSV file
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');

    // Parse CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log(`📊 Found ${records.length} invoices to import`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of records) {
      try {
        // Map QuickBooks CSV columns to database fields
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
          console.log(`⚠️  Skipping row - no invoice number found`);
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
          [invoiceNumber]
        );

        if (existingInvoice.rows.length > 0) {
          console.log(`⏭️  Skipping invoice ${invoiceNumber} - already exists`);
          skipped++;
          continue;
        }

        // Find customer by name
        const customerResult = await query(
          'SELECT id FROM customers WHERE name ILIKE $1',
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
            invoiceNumber,
            title,
            description || null,
            JSON.stringify(lineItems),
            subtotal,
            taxAmount,
            total,
            dueDate || null,
            paidDate || null,
            status,
            invoiceDate || new Date()
          ]
        );

        console.log(`✅ Imported: Invoice ${invoiceNumber} for ${customerName} ($${total.toFixed(2)})`);
        imported++;
      } catch (error) {
        console.error(`❌ Error importing invoice:`, error.message);
        console.error(`   Row data:`, record);
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
    process.exit(1);
  }
};

// Get CSV file path from command line argument
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.error('❌ Please provide a CSV file path');
  console.log('Usage: node scripts/import-invoices.js /path/to/invoices.csv');
  console.log('\nHow to export from QuickBooks:');
  console.log('1. Go to Sales > Invoices');
  console.log('2. Click "Export" or use Reports > Custom Reports');
  console.log('3. Select all invoices and export as CSV');
  console.log('4. Run this script with the exported CSV file');
  process.exit(1);
}

if (!fs.existsSync(csvFilePath)) {
  console.error(`❌ File not found: ${csvFilePath}`);
  process.exit(1);
}

importInvoices(csvFilePath);
