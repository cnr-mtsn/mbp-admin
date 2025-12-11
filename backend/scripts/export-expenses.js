import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Support both connection string and individual params
const clientConfig = process.env.DATABASE_URL || process.env.DB_URL
  ? {
      connectionString: process.env.DATABASE_URL || process.env.DB_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

async function exportExpenses() {
  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log('Connected to database');
    console.log('═'.repeat(60));

    // Get all expenses
    const result = await client.query(`
      SELECT * FROM expenses
      ORDER BY created_at ASC
    `);

    const expenses = result.rows;
    console.log(`Found ${expenses.length} expense records to export`);
    console.log('═'.repeat(60));

    if (expenses.length === 0) {
      console.log('\nNo expenses to export');
      return;
    }

    // Generate INSERT statements
    const outputLines = [];
    outputLines.push('-- Expenses Export');
    outputLines.push(`-- Generated: ${new Date().toISOString()}`);
    outputLines.push(`-- Total records: ${expenses.length}`);
    outputLines.push('');
    outputLines.push('-- Insert expenses');
    outputLines.push('');

    for (const expense of expenses) {
      const values = [
        expense.id ? `'${expense.id}'` : 'gen_random_uuid()',
        expense.job_id ? `'${expense.job_id}'` : 'NULL',
        expense.expense_type ? `'${expense.expense_type}'` : 'NULL',
        expense.vendor ? `'${expense.vendor.replace(/'/g, "''")}'` : 'NULL',
        expense.invoice_number ? `'${expense.invoice_number.replace(/'/g, "''")}'` : 'NULL',
        expense.invoice_date ? `'${expense.invoice_date.toISOString().split('T')[0]}'` : 'NULL',
        expense.po_number ? `'${expense.po_number.replace(/'/g, "''")}'` : 'NULL',
        expense.description ? `'${expense.description.replace(/'/g, "''")}'` : 'NULL',
        expense.line_items ? `'${JSON.stringify(expense.line_items).replace(/'/g, "''")}'::jsonb` : 'NULL',
        expense.subtotal ? `${expense.subtotal}` : 'NULL',
        expense.tax ? `${expense.tax}` : 'NULL',
        expense.total ? `${expense.total}` : 'NULL',
        expense.notes ? `'${expense.notes.replace(/'/g, "''")}'` : 'NULL',
        expense.pdf_path ? `'${expense.pdf_path.replace(/'/g, "''")}'` : 'NULL',
        expense.status ? `'${expense.status}'` : 'NULL',
        expense.created_at ? `'${expense.created_at.toISOString()}'` : 'NOW()',
        expense.updated_at ? `'${expense.updated_at.toISOString()}'` : 'NOW()'
      ];

      const insertStatement = `INSERT INTO expenses (id, job_id, expense_type, vendor, invoice_number, invoice_date, po_number, description, line_items, subtotal, tax, total, notes, pdf_path, status, created_at, updated_at) VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING;`;

      outputLines.push(insertStatement);
    }

    // Write to file
    const outputPath = path.join(__dirname, '../../exports/expenses-export.sql');
    const exportsDir = path.join(__dirname, '../../exports');

    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, outputLines.join('\n'));

    console.log(`\n✅ Export complete!`);
    console.log(`\nFile saved to: ${outputPath}`);
    console.log(`\nTo import to production:`);
    console.log(`  1. Update .env to use production DATABASE_URL`);
    console.log(`  2. Run: psql $DATABASE_URL -f ${outputPath}`);
    console.log(`  3. Or use: node scripts/import-expenses.js`);
    console.log('');

  } catch (error) {
    console.error('Error exporting expenses:', error);
  } finally {
    await client.end();
  }
}

exportExpenses();
