import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'matson_bros',
  user: 'cnrmtsn',
});

const convertUsersToUuid = async () => {
  const client = await pool.connect();

  try {
    console.log('🔄 Converting users table to use UUID...');
    console.log('⚠️  This will affect both inventory and billing apps!');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled');

    // Start transaction
    await client.query('BEGIN');

    // Drop existing primary key constraint
    console.log('\n📋 Dropping existing primary key constraint...');
    await client.query(`
      ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_pkey CASCADE
    `);

    // Drop the old sequence
    await client.query(`
      DROP SEQUENCE IF EXISTS users_id_seq CASCADE
    `);

    // Convert ID column to UUID
    console.log('📋 Converting id column to UUID...');
    await client.query(`
      ALTER TABLE users
      ALTER COLUMN id DROP DEFAULT,
      ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
      ALTER COLUMN id SET DEFAULT uuid_generate_v4()
    `);

    // Re-add primary key
    console.log('📋 Re-adding primary key constraint...');
    await client.query(`
      ALTER TABLE users ADD PRIMARY KEY (id)
    `);

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n✅ Users table successfully converted to UUID!');
    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('   - All existing user IDs have been regenerated as UUIDs');
    console.log('   - Both inventory and billing apps can now use UUID-based user IDs');
    console.log('   - You may need to log in again as tokens may be invalidated');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Conversion failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
};

convertUsersToUuid();
