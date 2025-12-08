import pool from '../config/database.js';

/**
 * Migration: Add gid_int generated columns and indexes for optimized GID lookups
 *
 * This migration adds a generated column to each table that stores the 13-digit
 * integer representation of the UUID (same as used in GID format).
 * This allows for fast indexed lookups when querying by GID.
 */
const addGidColumns = async () => {
  const client = await pool.connect();

  try {
    console.log('🔄 Adding gid_int columns and indexes for optimized GID lookups...\n');

    // Start transaction
    await client.query('BEGIN');

    const tables = ['customers', 'estimates', 'jobs', 'invoices'];

    for (const table of tables) {
      console.log(`📋 Processing ${table} table...`);

      // Add gid_int generated column
      // This column stores the 13-digit integer derived from the first 13 hex characters of the UUID
      // Formula: Take first 13 hex chars of UUID (without hyphens), convert to bigint, then to padded string
      await client.query(`
        ALTER TABLE ${table}
        ADD COLUMN IF NOT EXISTS gid_int VARCHAR(13)
        GENERATED ALWAYS AS (
          lpad(
            ('x' || substring(replace(id::text, '-', ''), 1, 13))::bit(52)::bigint::text,
            13,
            '0'
          )
        ) STORED
      `);
      console.log(`  ✅ Added gid_int column to ${table}`);

      // Create index on gid_int for fast lookups
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${table}_gid_int
        ON ${table}(gid_int)
      `);
      console.log(`  ✅ Created index idx_${table}_gid_int`);

      // Verify the generated column works
      const result = await client.query(`
        SELECT id, gid_int FROM ${table} LIMIT 1
      `);
      if (result.rows.length > 0) {
        console.log(`  ℹ️  Sample: id=${result.rows[0].id}, gid_int=${result.rows[0].gid_int}`);
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n✅ Successfully added gid_int columns and indexes to all tables!');
    console.log('\nℹ️  Performance improvements:');
    console.log('  - GID lookups now use indexed gid_int column instead of LIKE queries');
    console.log('  - Query time reduced from O(n) to O(log n)');
    console.log('  - No application code changes required - gidDatabase.js will be updated separately');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
};

addGidColumns();
