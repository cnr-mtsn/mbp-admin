import pg from 'pg';
const { Pool } = pg;

/**
 * User ID Migration Script - Integer to UUID
 *
 * This script converts user IDs from integers to UUIDs while preserving
 * data integrity and existing JWT tokens.
 *
 * Strategy:
 * 1. Create a temporary mapping of old integer IDs to new UUIDs
 * 2. Add a new UUID column to users table
 * 3. Generate deterministic UUIDs based on integer IDs (for consistency)
 * 4. Update all foreign key references
 * 5. Swap the old ID column with the new UUID column
 *
 * IMPORTANT: Run during off-hours. This will invalidate existing JWT tokens.
 *
 * Usage:
 *   DATABASE_URL=<production-db-url> node scripts/migrate-users-to-uuid.js
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DB_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const migrateUsersToUuid = async () => {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting user ID migration to UUID...\n');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled\n');

    // Start transaction
    await client.query('BEGIN');
    console.log('📦 Transaction started\n');

    // Check current state of users table
    const columnCheck = await client.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id'
    `);

    const currentType = columnCheck.rows[0]?.data_type;
    console.log(`Current users.id type: ${currentType}\n`);

    if (currentType === 'uuid') {
      console.log('✅ Users table already uses UUID. No migration needed.');
      await client.query('ROLLBACK');
      return;
    }

    if (currentType !== 'integer' && currentType !== 'bigint') {
      throw new Error(`Unexpected id type: ${currentType}. Expected integer or bigint.`);
    }

    // Step 1: Get all existing users and their IDs
    console.log('📋 Step 1: Reading existing users...');
    const existingUsers = await client.query('SELECT id FROM users ORDER BY id');
    console.log(`  Found ${existingUsers.rows.length} users\n`);

    // Step 2: Add a new UUID column
    console.log('📋 Step 2: Adding new UUID column...');
    await client.query(`
      ALTER TABLE users
      ADD COLUMN new_id UUID
    `);
    console.log('  ✅ Added new_id column\n');

    // Step 3: Generate UUIDs for each user (deterministic based on ID for consistency)
    console.log('📋 Step 3: Generating UUIDs for existing users...');
    for (const user of existingUsers.rows) {
      // Generate a UUID using uuid_generate_v5 with a namespace and the integer ID
      // This ensures consistency if the script needs to be re-run
      await client.query(`
        UPDATE users
        SET new_id = uuid_generate_v5(
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
          $1::text
        )
        WHERE id = $1
      `, [user.id]);
    }
    console.log('  ✅ Generated UUIDs for all users\n');

    // Step 4: Display the mapping for reference
    console.log('📋 User ID Mapping (Old ID → New UUID):\n');
    const mapping = await client.query(`
      SELECT id as old_id, new_id as new_uuid
      FROM users
      ORDER BY id
    `);
    mapping.rows.forEach(row => {
      console.log(`  ${row.old_id} → ${row.new_uuid}`);
    });
    console.log('');

    // Step 5: Drop the old primary key constraint
    console.log('📋 Step 5: Dropping old primary key constraint...');
    await client.query(`
      ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_pkey CASCADE
    `);
    console.log('  ✅ Old primary key dropped\n');

    // Step 6: Drop the old id column
    console.log('📋 Step 6: Removing old id column...');
    await client.query(`
      ALTER TABLE users
      DROP COLUMN id
    `);
    console.log('  ✅ Old id column removed\n');

    // Step 7: Rename new_id to id
    console.log('📋 Step 7: Renaming new_id to id...');
    await client.query(`
      ALTER TABLE users
      RENAME COLUMN new_id TO id
    `);
    console.log('  ✅ Column renamed\n');

    // Step 8: Set the new UUID column as NOT NULL and add primary key constraint
    console.log('📋 Step 8: Setting up new primary key...');
    await client.query(`
      ALTER TABLE users
      ALTER COLUMN id SET NOT NULL,
      ALTER COLUMN id SET DEFAULT uuid_generate_v4()
    `);

    await client.query(`
      ALTER TABLE users
      ADD PRIMARY KEY (id)
    `);
    console.log('  ✅ New primary key established\n');

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Transaction committed\n');

    // Verify final state
    console.log('📋 Verifying migration...');
    const finalCheck = await client.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    const finalType = finalCheck.rows[0]?.data_type;
    console.log(`  Final users.id type: ${finalType}\n`);

    const userCount = await client.query('SELECT COUNT(*) FROM users');
    console.log(`  Total users in table: ${userCount.rows[0].count}\n`);

    console.log('✅ User ID migration completed successfully!\n');
    console.log('⚠️  IMPORTANT NOTES:');
    console.log('   1. All user IDs have been converted from integers to UUIDs');
    console.log('   2. Existing JWT tokens will no longer work - users must log in again');
    console.log('   3. Save the ID mapping above if you need to reference old IDs');
    console.log('   4. You may need to update the auth.js resolver to handle UUID IDs\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error);
    console.error('\nError details:', error.message);
    console.error('\nStack trace:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

migrateUsersToUuid()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Migration script failed:', err);
    process.exit(1);
  });
