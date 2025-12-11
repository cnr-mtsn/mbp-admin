import { parseSpectrumPaintInvoice } from '../services/pdfParserService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPdfParser() {
  try {
    const pdfPath = path.join(__dirname, '../../imports/materials-invoices/spectrum-invoice-example.pdf');

    console.log('Testing PDF Parser...');
    console.log('PDF Path:', pdfPath);
    console.log('\nParsing invoice...\n');

    const result = await parseSpectrumPaintInvoice(pdfPath);

    console.log('✅ Successfully parsed PDF!');
    console.log('\nExtracted Data:');
    console.log('─'.repeat(60));
    console.log('Vendor:', result.vendor);
    console.log('Invoice Number:', result.invoice_number);
    console.log('Invoice Date:', result.invoice_date);
    console.log('PO Number:', result.po_number);
    console.log('Description:', result.description);
    console.log('Expense Type:', result.expense_type);
    console.log('Status:', result.status);
    console.log('\nFinancial Details:');
    console.log('─'.repeat(60));
    console.log('Subtotal:', result.subtotal ? `$${result.subtotal.toFixed(2)}` : 'N/A');
    console.log('Tax:', result.tax ? `$${result.tax.toFixed(2)}` : 'N/A');
    console.log('Total:', result.total ? `$${result.total.toFixed(2)}` : 'N/A');
    console.log('\nLine Items:');
    console.log('─'.repeat(60));

    if (result.line_items && result.line_items.length > 0) {
      result.line_items.forEach((item, index) => {
        console.log(`\nItem ${index + 1}:`);
        console.log('  Description:', item.description);
        console.log('  Quantity:', item.quantity);
        console.log('  Unit Price:', `$${item.unit_price.toFixed(2)}`);
        console.log('  Amount:', `$${item.amount.toFixed(2)}`);
      });
    } else {
      console.log('No line items found');
    }

    console.log('\n' + '─'.repeat(60));
    console.log('\nTest completed successfully! ✅');

  } catch (error) {
    console.error('\n❌ Error testing PDF parser:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testPdfParser();
