import pool from '../config/database.js';

const addGidToUsers = async () => {
  const client = await pool.connect();

  try {
    console.log('🔄 Adding gid_int column to users table...\n');

    await client.query('BEGIN');

    console.log('📋 Processing users table...');

    // Add gid_int generated column
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS gid_int VARCHAR(13)
      GENERATED ALWAYS AS (
        lpad(
          ('x' || substring(replace(id::text, '-', ''), 1, 13))::bit(52)::bigint::text,
          13,
          '0'
        )
      ) STORED
    `);
    console.log('  ✅ Added gid_int column to users');

    // Create index on gid_int for fast lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_gid_int
      ON users(gid_int)
    `);
    console.log('  ✅ Created index idx_users_gid_int');

    // Verify the generated column works
    const result = await client.query(`
      SELECT id, gid_int FROM users LIMIT 1
    `);
    if (result.rows.length > 0) {
      console.log(`  ℹ️  Sample: id=${result.rows[0].id}, gid_int=${result.rows[0].gid_int}`);
    }

    await client.query('COMMIT');

    console.log('\n✅ Successfully added gid_int column and index to users table!');

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

addGidToUsers();
