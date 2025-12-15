import { query } from '../config/database.js';
import { sendInvoiceEmail } from '../services/emailService.js';

/**
 * Manual script to send an invoice by invoice number
 * Usage: node scripts/send-invoice.js <invoice-number>
 * Example: node scripts/send-invoice.js INV-2024-001
 */

const sendInvoice = async (invoiceNumber) => {
  try {
    console.log(`Looking up invoice: ${invoiceNumber}...`);

    // Fetch invoice with customer information
    const result = await query(
      `SELECT i.*, c.name as customer_name, c.email as customer_email,
              c.phone as customer_phone, c.address as customer_address,
              j.title as job_title
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       LEFT JOIN jobs j ON i.job_id = j.id
       WHERE i.invoice_number = $1`,
      [invoiceNumber]
    );

    if (result.rows.length === 0) {
      console.error(`❌ Invoice not found: ${invoiceNumber}`);
      process.exit(1);
    }

    const invoice = result.rows[0];

    if (!invoice.customer_email) {
      console.error(`❌ Customer email not found for invoice: ${invoiceNumber}`);
      console.error(`   Customer: ${invoice.customer_name || 'Unknown'}`);
      process.exit(1);
    }

    console.log(`Found invoice: ${invoiceNumber}`);
    console.log(`  Title: ${invoice.title || 'N/A'}`);
    console.log(`  Customer: ${invoice.customer_name || 'Unknown'}`);
    console.log(`  Email: ${invoice.customer_email}`);
    console.log(`  Total: $${invoice.total || 0}`);
    console.log(`  Status: ${invoice.status || 'Unknown'}`);
    console.log('');
    console.log('Sending invoice email...');

    // Send the invoice email with PDF
    await sendInvoiceEmail(invoice);

    console.log('✅ Invoice sent successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error sending invoice:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// Get invoice number from command line arguments
const invoiceNumber = process.argv[2];

if (!invoiceNumber) {
  console.error('Usage: node scripts/send-invoice.js <invoice-number>');
  console.error('Example: node scripts/send-invoice.js INV-2024-001');
  process.exit(1);
}

sendInvoice(invoiceNumber);
