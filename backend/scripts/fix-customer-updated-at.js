import pg from 'pg';
const { Pool } = pg;

/**
 * Fix Customer updated_at Field
 *
 * This script sets updated_at to created_at for all customers where updated_at is NULL
 *
 * Usage:
 *   DATABASE_URL=<production-db-url> node scripts/fix-customer-updated-at.js
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DB_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const fixCustomerUpdatedAt = async () => {
  const client = await pool.connect();

  try {
    console.log('🚀 Fixing customer updated_at fields...\n');

    // Start transaction
    await client.query('BEGIN');
    console.log('📦 Transaction started\n');

    // Check how many customers have NULL updated_at
    const nullCount = await client.query(`
      SELECT COUNT(*) FROM customers WHERE updated_at IS NULL
    `);
    console.log(`Found ${nullCount.rows[0].count} customers with NULL updated_at\n`);

    if (nullCount.rows[0].count === '0') {
      console.log('✅ No customers need updating. All done!');
      await client.query('ROLLBACK');
      return;
    }

    // Update all customers with NULL updated_at to use created_at
    const result = await client.query(`
      UPDATE customers
      SET updated_at = created_at
      WHERE updated_at IS NULL
      RETURNING id, created_at, updated_at
    `);

    console.log(`✅ Updated ${result.rows.length} customers\n`);

    // Show a sample of the updates
    if (result.rows.length > 0) {
      console.log('Sample of updated records:');
      result.rows.slice(0, 5).forEach(row => {
        console.log(`  ID: ${row.id}`);
        console.log(`    created_at:  ${row.created_at}`);
        console.log(`    updated_at:  ${row.updated_at}`);
        console.log('');
      });

      if (result.rows.length > 5) {
        console.log(`  ... and ${result.rows.length - 5} more\n`);
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Transaction committed\n');

    // Verify final state
    const finalNullCount = await client.query(`
      SELECT COUNT(*) FROM customers WHERE updated_at IS NULL
    `);
    console.log(`Customers with NULL updated_at after fix: ${finalNullCount.rows[0].count}\n`);

    console.log('✅ Customer updated_at fix completed successfully!\n');

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

fixCustomerUpdatedAt()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Script failed:', err);
    process.exit(1);
  });
