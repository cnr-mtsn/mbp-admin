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

async function importExpenses() {
  const sqlFilePath = path.join(__dirname, '../../exports/expenses-export.sql');

  if (!fs.existsSync(sqlFilePath)) {
    console.error(`\n❌ Error: Export file not found: ${sqlFilePath}`);
    console.log('\nPlease run the export script first:');
    console.log('  node scripts/export-expenses.js');
    process.exit(1);
  }

  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log('Connected to database');
    console.log('═'.repeat(60));

    // Read the SQL file
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    const statements = sqlContent
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('--'))
      .join('\n');

    console.log('Importing expenses to database...');
    console.log('');

    // Execute the SQL
    const result = await client.query(statements);

    console.log('✅ Import complete!');
    console.log('');
    console.log('Verifying import...');

    // Count imported expenses
    const countResult = await client.query('SELECT COUNT(*) FROM expenses');
    const count = parseInt(countResult.rows[0].count);

    console.log(`Total expenses in database: ${count}`);
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error importing expenses:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

importExpenses();
