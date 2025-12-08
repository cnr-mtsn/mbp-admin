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

    // ========== Migrate Users table ==========
    console.log('1️⃣  Migrating USERS table...');
    await client.query('BEGIN');
    try {
      const usersCheck = await client.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'id'
      `);

      if (usersCheck.rows[0]?.data_type !== 'uuid') {
        // Step 1: Check for generated columns that depend on id
        console.log('   📋 Checking for generated columns...');
        const genCols = await client.query(`
          SELECT column_name, generation_expression
          FROM information_schema.columns
          WHERE table_name = 'users'
            AND is_generated = 'ALWAYS'
        `);

        const generatedColumns = [];
        if (genCols.rows.length > 0) {
          console.log(`   ⚠️  Found ${genCols.rows.length} generated column(s)`);
          for (const col of genCols.rows) {
            generatedColumns.push({
              name: col.column_name,
              expression: col.generation_expression
            });
            console.log(`   📋 Dropping generated column: ${col.column_name}`);
            await client.query(`ALTER TABLE users DROP COLUMN ${col.column_name}`);
          }
        }

        // Step 2: Drop constraints and migrate
        console.log('   📋 Dropping constraints...');
        await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey CASCADE');
        await client.query('DROP SEQUENCE IF EXISTS users_id_seq CASCADE');

        console.log('   📋 Converting id column to UUID...');
        await client.query(`
          ALTER TABLE users
          ALTER COLUMN id DROP DEFAULT,
          ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
          ALTER COLUMN id SET DEFAULT uuid_generate_v4()
        `);

        console.log('   📋 Re-adding primary key...');
        await client.query('ALTER TABLE users ADD PRIMARY KEY (id)');

        // Step 3: Recreate generated columns if any
        if (generatedColumns.length > 0) {
          console.log('   📋 Recreating generated columns...');
          for (const col of generatedColumns) {
            console.log(`   📋 Recreating: ${col.name}`);
            // Note: We'll need to adapt the expression for UUID
            // For now, skip recreation as we don't know the exact expression
            console.log(`   ⚠️  Skipped: ${col.name} (needs manual recreation)`);
          }
        }

        console.log('   ✅ Users table migrated to UUID');
      } else {
        console.log('   ℹ️  Users table already uses UUID');
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('   ❌ Users migration failed:', error.message);
      console.error('   Full error:', error);
    }

    // ========== Migrate Transactions table ==========
    console.log('\n2️⃣  Migrating TRANSACTIONS table...');
    await client.query('BEGIN');
    try {
      const transCheck = await client.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'transactions' AND column_name = 'id'
      `);

      if (transCheck.rows[0]?.data_type !== 'uuid') {
        // Check for generated columns
        const genCols = await client.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'transactions' AND is_generated = 'ALWAYS'
        `);

        if (genCols.rows.length > 0) {
          console.log(`   ⚠️  Found ${genCols.rows.length} generated column(s), dropping...`);
          for (const col of genCols.rows) {
            await client.query(`ALTER TABLE transactions DROP COLUMN ${col.column_name}`);
          }
        }

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

    // ========== Check Products table ==========
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

    // ========== Migrate Billing tables ==========
    const billingTables = ['customers', 'estimates', 'jobs', 'invoices'];

    for (let i = 0; i < billingTables.length; i++) {
      const table = billingTables[i];
      console.log(`\n${4 + i}️⃣  Migrating ${table.toUpperCase()} table...`);
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
          // Check and drop generated columns
          const genCols = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = $1 AND is_generated = 'ALWAYS'
          `, [table]);

          if (genCols.rows.length > 0) {
            for (const col of genCols.rows) {
              await client.query(`ALTER TABLE ${table} DROP COLUMN ${col.column_name}`);
            }
          }

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
    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('   - All IDs have been regenerated as UUIDs');
    console.log('   - If any generated columns were dropped, you may need to recreate them manually');
    console.log('   - You may need to log out and log back in');
    console.log('   - Clear any cached data in your frontend applications');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

migrateToUUID();
