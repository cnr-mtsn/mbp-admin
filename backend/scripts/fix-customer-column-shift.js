import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const { Pool } = pg;

/**
 * Fix Customer Data Column Shift
 *
 * This script fixes a data import issue where customer data was shifted by one column:
 * - email was stored in company_name
 * - phone was stored in email
 * - address was stored in phone
 * - city was stored in address
 * - state was stored in city
 * - zip was stored in state
 * - created_at was stored in zip
 * - updated_at was stored in created_at
 * - updated_at column is correct (no updates since import)
 *
 * The script will shift all data back to the correct columns.
 *
 * Usage:
 *   DATABASE_URL=<production-db-url> node scripts/fix-customer-column-shift.js
 */

const connectionString = process.env.DATABASE_URL || process.env.DB_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL environment variable is not set');
  console.error('\nUsage:');
  console.error('  DATABASE_URL=postgresql://user@host:port/database node scripts/fix-customer-column-shift.js\n');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('amazonaws.com') || connectionString.includes('render.com') ? { rejectUnauthorized: false } : false
});

const fixCustomerData = async () => {
  const client = await pool.connect();

  try {
    console.log('🔧 Starting customer data column shift fix...\n');

    // Start transaction
    await client.query('BEGIN');
    console.log('📦 Transaction started\n');

    // First, let's see a sample of the current (incorrect) data
    console.log('📋 Sample of current (incorrect) data:');
    const sampleBefore = await client.query(`
      SELECT
        id,
        name,
        company_name as "company_name (has email)",
        email as "email (has phone)",
        phone as "phone (has address)",
        address as "address (has city)",
        city as "city (has state)",
        state as "state (has zip)",
        zip as "zip (has created_at)",
        created_at as "created_at (has updated_at)",
        updated_at as "updated_at (correct)"
      FROM customers
      LIMIT 3
    `);
    console.table(sampleBefore.rows);

    // Get count of customers to fix
    const countResult = await client.query('SELECT COUNT(*) FROM customers');
    const totalCustomers = parseInt(countResult.rows[0].count);
    console.log(`\n📊 Total customers to fix: ${totalCustomers}\n`);

    // Fix the data shift
    // We need to shift data to the right columns:
    // correct_email = current company_name
    // correct_phone = current email
    // correct_address = current phone
    // correct_city = current address
    // correct_state = current city
    // correct_zip = current state
    // correct_created_at = current zip (cast to timestamp)
    // correct_updated_at = current created_at (cast to timestamp)
    // company_name should be NULL (since we don't have that data)

    console.log('🔄 Shifting data to correct columns...');

    await client.query(`
      UPDATE customers
      SET
        company_name = NULL,
        email = company_name,
        phone = email,
        address = phone,
        city = address,
        state = city,
        zip = state,
        created_at = CASE
          WHEN zip ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN zip::timestamp
          ELSE created_at
        END,
        updated_at = CASE
          WHEN created_at IS NOT NULL THEN created_at
          ELSE updated_at
        END
    `);

    console.log('✅ Data shifted successfully\n');

    // Show sample of corrected data
    console.log('📋 Sample of corrected data:');
    const sampleAfter = await client.query(`
      SELECT
        id,
        name,
        company_name,
        email,
        phone,
        address,
        city,
        state,
        zip,
        created_at,
        updated_at
      FROM customers
      LIMIT 3
    `);
    console.table(sampleAfter.rows);

    // Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ Transaction committed\n');

    console.log(`✅ Successfully fixed ${totalCustomers} customer records!\n`);
    console.log('📌 Summary of changes:');
    console.log('  - Emails moved from company_name to email column');
    console.log('  - Phone numbers moved from email to phone column');
    console.log('  - Addresses moved from phone to address column');
    console.log('  - Cities moved from address to city column');
    console.log('  - States moved from city to state column');
    console.log('  - ZIP codes moved from state to zip column');
    console.log('  - Timestamps corrected in created_at and updated_at');
    console.log('  - company_name set to NULL (original data not available)\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Fix failed:', error);
    console.error('\nError details:', error.message);
    console.error('\nStack trace:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

fixCustomerData()
  .then(() => {
    console.log('✅ Fix script completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Fix script failed:', err);
    process.exit(1);
  });
