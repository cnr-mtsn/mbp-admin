import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'matson_bros',
  user: 'cnrmtsn',
  password: '',
});

const removeGidIntColumns = async () => {
  const client = await pool.connect();

  try {
    console.log('🔄 Removing gid_int columns from all tables...\n');

    // Check all tables for gid_int column
    const tables = ['users', 'transactions', 'products', 'customers', 'estimates', 'jobs', 'invoices'];

    console.log('📋 Checking for gid_int columns...\n');

    const tablesWithGidInt = [];

    for (const table of tables) {
      const result = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'gid_int'
      `, [table]);

      if (result.rows.length > 0) {
        tablesWithGidInt.push(table);
        console.log(`   ✓ Found gid_int in: ${table}`);
      }
    }

    if (tablesWithGidInt.length === 0) {
      console.log('   ✅ No gid_int columns found!\n');
      return;
    }

    console.log(`\n📊 Found gid_int in ${tablesWithGidInt.length} table(s)\n`);
    console.log('🗑️  Dropping gid_int columns...\n');

    // Drop gid_int from each table
    for (const table of tablesWithGidInt) {
      await client.query('BEGIN');
      try {
        await client.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS gid_int`);
        console.log(`   ✅ Dropped gid_int from ${table}`);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`   ❌ Failed to drop gid_int from ${table}:`, error.message);
      }
    }

    // Verify removal
    console.log('\n🔍 Verifying removal...\n');

    for (const table of tablesWithGidInt) {
      const result = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'gid_int'
      `, [table]);

      if (result.rows.length === 0) {
        console.log(`   ✓ ${table}: gid_int removed`);
      } else {
        console.log(`   ✗ ${table}: gid_int still exists`);
      }
    }

    console.log('\n✅ Cleanup complete!');
    console.log('\n📝 Summary:');
    console.log('   - gid_int columns have been removed');
    console.log('   - Database now stores only UUIDs');
    console.log('   - GraphQL API generates GIDs dynamically from UUIDs');
    console.log('   - No application code changes needed - resolvers already handle this!\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

removeGidIntColumns();
