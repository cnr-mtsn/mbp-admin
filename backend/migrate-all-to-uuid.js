import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'matson_bros',
  user: 'cnrmtsn',
  password: '',
});

const migrateToUUID = async () => {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting UUID migration for all tables...\n');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled\n');

    // Check current schema
    console.log('📋 Checking current schema...\n');

    const tables = ['users', 'transactions', 'products', 'customers', 'estimates', 'jobs', 'invoices'];

    for (const table of tables) {
      const result = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'id'
      `, [table]);

      if (result.rows.length > 0) {
        console.log(`   ${table}: ${result.rows[0].data_type}`);
      } else {
        console.log(`   ${table}: TABLE NOT FOUND`);
      }
    }

    console.log('\n🔄 Starting migrations...\n');

    // Migrate Users table
    console.log('1️⃣  Migrating USERS table...');
    await client.query('BEGIN');
    try {
      const usersCheck = await client.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'id'
      `);

      if (usersCheck.rows[0]?.data_type !== 'uuid') {
        await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey CASCADE');
        await client.query('DROP SEQUENCE IF EXISTS users_id_seq CASCADE');
        await client.query(`
          ALTER TABLE users
          ALTER COLUMN id DROP DEFAULT,
          ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
          ALTER COLUMN id SET DEFAULT uuid_generate_v4()
        `);
        await client.query('ALTER TABLE users ADD PRIMARY KEY (id)');
        console.log('   ✅ Users table migrated to UUID');
      } else {
        console.log('   ℹ️  Users table already uses UUID');
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('   ❌ Users migration failed:', error.message);
    }

    // Migrate Transactions table
    console.log('\n2️⃣  Migrating TRANSACTIONS table...');
    await client.query('BEGIN');
    try {
      const transCheck = await client.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'transactions' AND column_name = 'id'
      `);

      if (transCheck.rows[0]?.data_type !== 'uuid') {
        await client.query('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_pkey CASCADE');
        await client.query('DROP SEQUENCE IF EXISTS transactions_id_seq CASCADE');
        await client.query(`
          ALTER TABLE transactions
          ALTER COLUMN id DROP DEFAULT,
          ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
          ALTER COLUMN id SET DEFAULT uuid_generate_v4()
        `);
        await client.query('ALTER TABLE transactions ADD PRIMARY KEY (id)');
        console.log('   ✅ Transactions table migrated to UUID');
      } else {
        console.log('   ℹ️  Transactions table already uses UUID');
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('   ❌ Transactions migration failed:', error.message);
    }

    // Check Products table (should already be UUID)
    console.log('\n3️⃣  Checking PRODUCTS table...');
    const productsCheck = await client.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'id'
    `);
    if (productsCheck.rows[0]?.data_type === 'uuid') {
      console.log('   ✅ Products table already uses UUID');
    } else {
      console.log('   ⚠️  Products table needs manual migration');
    }

    // Migrate Billing tables (customers, estimates, jobs, invoices)
    const billingTables = ['customers', 'estimates', 'jobs', 'invoices'];

    for (const table of billingTables) {
      console.log(`\n4️⃣  Migrating ${table.toUpperCase()} table...`);
      await client.query('BEGIN');
      try {
        const check = await client.query(`
          SELECT data_type FROM information_schema.columns
          WHERE table_name = $1 AND column_name = 'id'
        `, [table]);

        if (!check.rows[0]) {
          console.log(`   ⚠️  Table ${table} does not exist`);
          await client.query('COMMIT');
          continue;
        }

        if (check.rows[0].data_type !== 'uuid') {
          await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_pkey CASCADE`);
          await client.query(`DROP SEQUENCE IF EXISTS ${table}_id_seq CASCADE`);
          await client.query(`
            ALTER TABLE ${table}
            ALTER COLUMN id DROP DEFAULT,
            ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
            ALTER COLUMN id SET DEFAULT uuid_generate_v4()
          `);
          await client.query(`ALTER TABLE ${table} ADD PRIMARY KEY (id)`);

          // Handle foreign keys
          if (table === 'estimates' || table === 'jobs' || table === 'invoices') {
            await client.query(`
              ALTER TABLE ${table}
              ALTER COLUMN customer_id TYPE UUID USING uuid_generate_v4()
            `);
          }
          if (table === 'jobs' || table === 'invoices') {
            await client.query(`
              ALTER TABLE ${table}
              ALTER COLUMN estimate_id TYPE UUID USING uuid_generate_v4()
            `);
          }
          if (table === 'invoices') {
            await client.query(`
              ALTER TABLE ${table}
              ALTER COLUMN job_id TYPE UUID USING uuid_generate_v4()
            `);
          }

          console.log(`   ✅ ${table} table migrated to UUID`);
        } else {
          console.log(`   ℹ️  ${table} table already uses UUID`);
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`   ❌ ${table} migration failed:`, error.message);
      }
    }

    console.log('\n✅ UUID migration complete!');
    console.log('\n⚠️  IMPORTANT: All IDs have been regenerated. You may need to:');
    console.log('   - Log out and log back in');
    console.log('   - Clear any cached data in your frontend applications');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

migrateToUUID();
