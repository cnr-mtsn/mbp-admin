import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'matson_bros',
  user: 'cnrmtsn',
  password: '',
});

const checkSchema = async () => {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking current database schema...\n');
    console.log('=' .repeat(60));

    const tables = ['users', 'transactions', 'products', 'customers', 'estimates', 'jobs', 'invoices'];

    for (const table of tables) {
      const result = await client.query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'id'
        ORDER BY column_name
      `, [table]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        const status = row.data_type === 'uuid' ? '✅ UUID' : '❌ INTEGER';
        console.log(`\n📋 ${table.toUpperCase()}`);
        console.log(`   Status: ${status}`);
        console.log(`   Type: ${row.data_type}`);
        console.log(`   Default: ${row.column_default || 'NONE'}`);
      } else {
        console.log(`\n📋 ${table.toUpperCase()}`);
        console.log(`   Status: ⚠️  TABLE NOT FOUND`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Summary:');

    const needsMigration = [];
    const alreadyUUID = [];
    const notFound = [];

    for (const table of tables) {
      const result = await client.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'id'
      `, [table]);

      if (result.rows.length === 0) {
        notFound.push(table);
      } else if (result.rows[0].data_type === 'uuid') {
        alreadyUUID.push(table);
      } else {
        needsMigration.push(table);
      }
    }

    if (alreadyUUID.length > 0) {
      console.log(`\n✅ Already using UUID (${alreadyUUID.length}):`);
      alreadyUUID.forEach(t => console.log(`   - ${t}`));
    }

    if (needsMigration.length > 0) {
      console.log(`\n❌ Need UUID migration (${needsMigration.length}):`);
      needsMigration.forEach(t => console.log(`   - ${t}`));
      console.log('\n💡 Run: node migrate-all-to-uuid.js');
    }

    if (notFound.length > 0) {
      console.log(`\n⚠️  Tables not found (${notFound.length}):`);
      notFound.forEach(t => console.log(`   - ${t}`));
    }

    if (needsMigration.length === 0 && notFound.length === 0) {
      console.log('\n🎉 All tables are using UUID!');
    }

    console.log();

  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

checkSchema();
