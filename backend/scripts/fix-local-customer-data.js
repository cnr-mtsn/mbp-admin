import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const { Pool } = pg;

/**
 * Fix Local Customer Data Column Shift
 *
 * This script fixes the local database after running the wrong fix script.
 * Current incorrect state (after running the wrong script):
 * - company_name is correct
 * - email is stored in phone
 * - phone is stored in address
 * - address is stored in city
 * - city is stored in state
 * - state is stored in zip
 * - zip is NULL/lost
 * - created_at is correct
 * - updated_at is correct
 *
 * The script will shift all data back to the correct columns.
 *
 * Usage:
 *   DATABASE_URL=<local-db-url> node scripts/fix-local-customer-data.js
 */

const connectionString = process.env.DATABASE_URL || process.env.DB_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL environment variable is not set');
  console.error('\nUsage:');
  console.error('  DATABASE_URL=postgresql://user@host:port/database node scripts/fix-local-customer-data.js\n');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('amazonaws.com') || connectionString.includes('render.com') ? { rejectUnauthorized: false } : false
});

const fixLocalCustomerData = async () => {
  const client = await pool.connect();

  try {
    console.log('🔧 Starting local customer data fix...\n');

    // Start transaction
    await client.query('BEGIN');
    console.log('📦 Transaction started\n');

    // First, let's see a sample of the current (incorrect) data
    console.log('📋 Sample of current (incorrect) data:');
    const sampleBefore = await client.query(`
      SELECT
        id,
        name,
        company_name as "company_name (correct)",
        email as "email (NULL?)",
        phone as "phone (has email)",
        address as "address (has phone)",
        city as "city (has address)",
        state as "state (has city)",
        zip as "zip (has state)",
        created_at as "created_at (correct)",
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
    // correct_email = current phone
    // correct_phone = current address
    // correct_address = current city
    // correct_city = current state
    // correct_state = current zip
    // correct_zip = NULL (lost data)

    console.log('🔄 Shifting data to correct columns...');

    await client.query(`
      UPDATE customers
      SET
        email = phone,
        phone = address,
        address = city,
        city = state,
        state = zip,
        zip = NULL
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
    console.log('  - Emails moved from phone to email column');
    console.log('  - Phone numbers moved from address to phone column');
    console.log('  - Addresses moved from city to address column');
    console.log('  - Cities moved from state to city column');
    console.log('  - States moved from zip to state column');
    console.log('  - ZIP codes set to NULL (data was lost in previous script)\n');
    console.log('⚠️  Note: ZIP code data was lost. You may need to re-import customers.\n');

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

fixLocalCustomerData()
  .then(() => {
    console.log('✅ Fix script completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Fix script failed:', err);
    process.exit(1);
  });
