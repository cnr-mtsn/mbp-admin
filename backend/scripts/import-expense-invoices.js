import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseSpectrumPaintInvoice } from '../services/pdfParserService.js';
import { query } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory paths
const BASE_DIR = path.join(__dirname, '../../imports/materials-invoices');
const MANUAL_IMPORT_DIR = path.join(BASE_DIR, 'manual-import');
const PROCESSED_DIR = path.join(BASE_DIR, 'processed');
const DUPLICATES_DIR = path.join(BASE_DIR, 'duplicates');
const ERRORS_DIR = path.join(BASE_DIR, 'errors');

/**
 * Ensure all required directories exist
 */
function ensureDirectories() {
  [BASE_DIR, MANUAL_IMPORT_DIR, PROCESSED_DIR, DUPLICATES_DIR, ERRORS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
}

/**
 * Check if an expense with this vendor and invoice number already exists
 */
async function isDuplicateInvoice(vendor, invoiceNumber) {
  try {
    const result = await query(
      `SELECT id, invoice_number, total FROM expenses
       WHERE vendor = $1 AND invoice_number = $2 LIMIT 1`,
      [vendor, invoiceNumber]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error checking for duplicate invoice:', error);
    return null;
  }
}

/**
 * Create expense record in database
 */
async function createExpenseRecord(parsedData, pdfPath) {
  try {
    const result = await query(
      `INSERT INTO expenses (
        expense_type, vendor, invoice_number, invoice_date, po_number,
        description, line_items, subtotal, tax, total, pdf_path, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, invoice_number, total`,
      [
        parsedData.expense_type || 'materials',
        parsedData.vendor,
        parsedData.invoice_number,
        parsedData.invoice_date,
        parsedData.po_number,
        parsedData.description,
        JSON.stringify(parsedData.line_items || []),
        parsedData.subtotal,
        parsedData.tax,
        parsedData.total,
        pdfPath,
        parsedData.status || 'pending_review'
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error creating expense record:', error);
    throw error;
  }
}

/**
 * Process a single PDF file
 */
async function processPdfFile(filename, sourcePath) {
  const timestamp = Date.now();
  const safeFilename = `${timestamp}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  try {
    console.log(`\n📄 Processing: ${filename}`);

    // Parse the PDF
    const parsedData = await parseSpectrumPaintInvoice(sourcePath);

    if (!parsedData.invoice_number) {
      throw new Error('Could not extract invoice number from PDF');
    }

    console.log(`   Invoice #: ${parsedData.invoice_number}`);
    console.log(`   PO #: ${parsedData.po_number || 'N/A'}`);
    console.log(`   Date: ${parsedData.invoice_date || 'N/A'}`);
    console.log(`   Total: $${parsedData.total?.toFixed(2) || '0.00'}`);

    // Check for duplicates
    const duplicate = await isDuplicateInvoice(parsedData.vendor, parsedData.invoice_number);
    if (duplicate) {
      console.log(`   ⚠️  DUPLICATE - Invoice already exists (ID: ${duplicate.id})`);
      const duplicatePath = path.join(DUPLICATES_DIR, safeFilename);
      fs.copyFileSync(sourcePath, duplicatePath);
      return {
        status: 'duplicate',
        filename,
        invoice_number: parsedData.invoice_number,
        existing_id: duplicate.id
      };
    }

    // Create expense record
    const relativePathForDb = `imports/materials-invoices/processed/${safeFilename}`;
    const expense = await createExpenseRecord(parsedData, relativePathForDb);

    // Move to processed directory
    const processedPath = path.join(PROCESSED_DIR, safeFilename);
    fs.copyFileSync(sourcePath, processedPath);
    console.log(`   ✅ SUCCESS - Created expense ID: ${expense.id}`);

    return {
      status: 'success',
      filename,
      expense_id: expense.id,
      invoice_number: expense.invoice_number,
      total: expense.total
    };
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}`);

    // Move to errors directory
    const errorPath = path.join(ERRORS_DIR, safeFilename);
    fs.copyFileSync(sourcePath, errorPath);

    return {
      status: 'error',
      filename,
      error: error.message
    };
  }
}

/**
 * Main import function
 */
async function importExpenseInvoices() {
  console.log('🚀 Starting bulk expense invoice import\n');
  console.log('═'.repeat(60));

  // Ensure directories exist
  ensureDirectories();

  // Get custom path from command line argument or use default
  const importPath = process.argv[2] || MANUAL_IMPORT_DIR;

  if (!fs.existsSync(importPath)) {
    console.error(`\n❌ Error: Directory does not exist: ${importPath}`);
    console.log('\nUsage:');
    console.log('  node scripts/import-expense-invoices.js [path/to/folder]');
    console.log('\nDefault folder:');
    console.log(`  ${MANUAL_IMPORT_DIR}`);
    process.exit(1);
  }

  console.log(`Import folder: ${importPath}`);
  console.log('═'.repeat(60));

  // Find all PDF files
  const files = fs.readdirSync(importPath).filter(file =>
    file.toLowerCase().endsWith('.pdf')
  );

  if (files.length === 0) {
    console.log('\n⚠️  No PDF files found in the import folder');
    console.log(`\nPlace PDF invoices in: ${importPath}`);
    process.exit(0);
  }

  console.log(`\nFound ${files.length} PDF file(s) to process`);

  // Process each PDF
  const results = [];
  for (const file of files) {
    const filePath = path.join(importPath, file);
    const result = await processPdfFile(file, filePath);
    results.push(result);
  }

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('═'.repeat(60));

  const successful = results.filter(r => r.status === 'success');
  const duplicates = results.filter(r => r.status === 'duplicate');
  const errors = results.filter(r => r.status === 'error');

  console.log(`\n✅ Successfully imported: ${successful.length}`);
  if (successful.length > 0) {
    successful.forEach(r => {
      console.log(`   - ${r.filename}`);
      console.log(`     Invoice: ${r.invoice_number} | Expense ID: ${r.expense_id} | Total: $${parseFloat(r.total || 0).toFixed(2)}`);
    });
  }

  console.log(`\n⚠️  Duplicates skipped: ${duplicates.length}`);
  if (duplicates.length > 0) {
    duplicates.forEach(r => {
      console.log(`   - ${r.filename} (Invoice: ${r.invoice_number})`);
    });
  }

  console.log(`\n❌ Errors: ${errors.length}`);
  if (errors.length > 0) {
    errors.forEach(r => {
      console.log(`   - ${r.filename}`);
      console.log(`     Error: ${r.error}`);
    });
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n📁 File locations:');
  console.log(`   Processed: ${PROCESSED_DIR}`);
  console.log(`   Duplicates: ${DUPLICATES_DIR}`);
  console.log(`   Errors: ${ERRORS_DIR}`);

  console.log('\n✨ Import complete!\n');

  // Clean up original files if they were successfully processed or duplicates
  const toDelete = results.filter(r => r.status === 'success' || r.status === 'duplicate');
  if (toDelete.length > 0 && importPath !== MANUAL_IMPORT_DIR) {
    console.log('💡 Tip: Original files have been copied. You can delete them from:');
    console.log(`   ${importPath}\n`);
  }

  process.exit(0);
}

// Run the import
importExpenseInvoices().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
