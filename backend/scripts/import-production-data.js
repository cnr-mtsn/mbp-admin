import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Import Production Data to Render Database
 *
 * This script imports all billing production data from your local database
 * to the Render production database.
 *
 * IMPORTANT: Run this AFTER running migrate-render-db.js to create tables
 *
 * Usage:
 * 1. Set DATABASE_URL environment variable to your Render database URL
 * 2. Run: node scripts/import-production-data.js
 */

// SSL is always required for Render databases
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DB_URL,
  ssl: { rejectUnauthorized: false }
});

const importData = async () => {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting production data import to Render...\n');

    // Read the SQL export file
    const sqlFilePath = path.join(__dirname, '..', 'data-export-production.sql');

    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found: ${sqlFilePath}\n\nPlease ensure data-export-production.sql exists in the backend directory.`);
    }

    console.log('📁 Reading SQL export file...');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✓ SQL file loaded successfully\n');

    // Check current row counts BEFORE import
    console.log('📊 Current data in Render database:');
    const tables = ['customers', 'services', 'estimates', 'jobs', 'invoices'];
    const beforeCounts = {};

    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      beforeCounts[table] = parseInt(result.rows[0].count);
      console.log(`  ${table}: ${beforeCounts[table]} rows`);
    }

    console.log('\n⚠️  WARNING: This will insert data into the production database.');
    console.log('   If data already exists, you may get duplicate key errors.\n');

    // Begin transaction
    await client.query('BEGIN');
    console.log('🔒 Transaction started\n');

    try {
      // Execute the SQL import
      console.log('📥 Importing data...');
      await client.query(sqlContent);

      // Commit transaction
      await client.query('COMMIT');
      console.log('✓ Data import completed successfully\n');

      // Check row counts AFTER import
      console.log('📊 Updated data in Render database:');
      for (const table of tables) {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        const afterCount = parseInt(result.rows[0].count);
        const added = afterCount - beforeCounts[table];
        console.log(`  ${table}: ${afterCount} rows (+${added} new)`);
      }

      console.log('\n✅ Production data import completed successfully!');
      console.log('\n📌 Next steps:');
      console.log('1. Verify data in your billing app');
      console.log('2. Test creating new customers, invoices, etc.');
      console.log('3. Check that relationships between tables are intact');

    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error('❌ Import failed, transaction rolled back');
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);

    if (error.message.includes('duplicate key')) {
      console.error('\n💡 SOLUTION: Data already exists in the database.');
      console.error('   Options:');
      console.error('   1. Clear existing data first (if safe to do so)');
      console.error('   2. Modify the SQL file to use ON CONFLICT clauses');
      console.error('   3. Skip import if data is already present\n');
    }

    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

importData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
