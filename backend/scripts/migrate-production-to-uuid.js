import pg from 'pg';
const { Pool } = pg;

/**
 * Production Database UUID Migration Script
 *
 * This script converts ALL tables in the production database to use UUID primary keys
 * for consistency across the entire application.
 *
 * IMPORTANT: This will change all existing IDs. Run this during off-hours.
 *
 * Usage:
 *   DATABASE_URL=<production-db-url> node scripts/migrate-production-to-uuid.js
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DB_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const migrateToUuid = async () => {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting production database UUID migration...\n');
    console.log('⚠️  This will convert ALL tables to use UUID primary keys\n');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled\n');

    // Start transaction
    await client.query('BEGIN');
    console.log('📦 Transaction started\n');

    // Helper function to check if a table exists
    const tableExists = async (tableName) => {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [tableName]);
      return result.rows[0].exists;
    };

    // Helper function to check column type
    const getColumnType = async (tableName, columnName) => {
      const result = await client.query(`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = $2
      `, [tableName, columnName]);
      return result.rows[0]?.data_type;
    };

    // 1. USERS TABLE
    console.log('👤 Migrating users table...');
    if (await tableExists('users')) {
      const idType = await getColumnType('users', 'id');

      if (idType === 'integer' || idType === 'bigint') {
        console.log('  Converting users from integer to UUID...');

        await client.query(`
          ALTER TABLE users
          DROP CONSTRAINT IF EXISTS users_pkey CASCADE
        `);

        await client.query(`
          ALTER TABLE users
          ALTER COLUMN id DROP DEFAULT,
          ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
          ALTER COLUMN id SET DEFAULT uuid_generate_v4()
        `);

        await client.query(`
          ALTER TABLE users ADD PRIMARY KEY (id)
        `);

        console.log('  ✅ Users table converted to UUID');
      } else if (idType === 'uuid') {
        console.log('  ✅ Users table already uses UUID (skipped)');
      } else {
        console.log('  ⚠️  Unknown users.id type:', idType);
      }
    } else {
      // Create users table with UUID if it doesn't exist
      console.log('  Creating users table with UUID...');
      await client.query(`
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          first_name VARCHAR(50),
          last_name VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('  ✅ Created users table with UUID');
    }

    // 2. CUSTOMERS TABLE
    console.log('\n👥 Migrating customers table...');
    if (await tableExists('customers')) {
      const idType = await getColumnType('customers', 'id');

      if (idType === 'integer' || idType === 'bigint') {
        console.log('  Converting customers from integer to UUID...');

        await client.query(`
          ALTER TABLE customers
          DROP CONSTRAINT IF EXISTS customers_pkey CASCADE
        `);

        await client.query(`
          ALTER TABLE customers
          ALTER COLUMN id DROP DEFAULT,
          ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
          ALTER COLUMN id SET DEFAULT uuid_generate_v4()
        `);

        await client.query(`
          ALTER TABLE customers ADD PRIMARY KEY (id)
        `);

        console.log('  ✅ Customers table converted to UUID');
      } else {
        console.log('  ✅ Customers table already uses UUID (skipped)');
      }
    }

    // 3. PRODUCTS TABLE
    console.log('\n📦 Migrating products table...');
    if (await tableExists('products')) {
      const idType = await getColumnType('products', 'id');

      if (idType === 'integer' || idType === 'bigint') {
        console.log('  Converting products from integer to UUID...');

        await client.query(`
          ALTER TABLE products
          DROP CONSTRAINT IF EXISTS products_pkey CASCADE
        `);

        await client.query(`
          ALTER TABLE products
          ALTER COLUMN id DROP DEFAULT,
          ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
          ALTER COLUMN id SET DEFAULT uuid_generate_v4()
        `);

        await client.query(`
          ALTER TABLE products ADD PRIMARY KEY (id)
        `);

        console.log('  ✅ Products table converted to UUID');
      } else if (idType === 'uuid') {
        console.log('  ✅ Products table already uses UUID (skipped)');
      } else {
        // Create products table with UUID if it doesn't exist
        console.log('  Creating products table with UUID...');
        await client.query(`
          CREATE TABLE products (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            product_type VARCHAR(100) NOT NULL,
            category VARCHAR(100),
            brand VARCHAR(255),
            color VARCHAR(255),
            color_code VARCHAR(100),
            sheen VARCHAR(50),
            container_size VARCHAR(20),
            amount_gallons DECIMAL(10, 3) DEFAULT 0,
            status VARCHAR(50) DEFAULT 'available',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP,
            depleted_at TIMESTAMP,
            attributes JSONB DEFAULT '{}'
          );
        `);

        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
          CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
          CREATE INDEX IF NOT EXISTS idx_products_search ON products(brand, color, color_code, category);
          CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);
          CREATE INDEX IF NOT EXISTS idx_products_depleted_at ON products(depleted_at);
          CREATE INDEX IF NOT EXISTS idx_products_attributes_gin ON products USING gin(attributes);
        `);

        console.log('  ✅ Created products table with UUID');
      }
    }

    // 4. TRANSACTIONS TABLE
    console.log('\n📊 Migrating transactions table...');
    if (await tableExists('transactions')) {
      const idType = await getColumnType('transactions', 'id');
      const productIdType = await getColumnType('transactions', 'product_id');

      if (idType === 'integer' || idType === 'bigint' || productIdType === 'integer' || productIdType === 'bigint') {
        console.log('  Converting transactions from integer to UUID...');

        // Drop constraints
        await client.query(`
          ALTER TABLE transactions
          DROP CONSTRAINT IF EXISTS transactions_pkey CASCADE,
          DROP CONSTRAINT IF EXISTS transactions_product_id_fkey CASCADE
        `);

        // Convert columns
        await client.query(`
          ALTER TABLE transactions
          ALTER COLUMN id DROP DEFAULT,
          ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
          ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
          ALTER COLUMN product_id TYPE UUID USING uuid_generate_v4()
        `);

        // Re-add constraints
        await client.query(`
          ALTER TABLE transactions ADD PRIMARY KEY (id)
        `);

        await client.query(`
          ALTER TABLE transactions
          ADD CONSTRAINT transactions_product_id_fkey
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        `);

        console.log('  ✅ Transactions table converted to UUID');
      } else if (idType === 'uuid') {
        console.log('  ✅ Transactions table already uses UUID (skipped)');
      } else {
        // Create transactions table with UUID if it doesn't exist
        console.log('  Creating transactions table with UUID...');
        await client.query(`
          CREATE TABLE transactions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            transaction_type VARCHAR(50) NOT NULL,
            employee_name VARCHAR(255) NOT NULL,
            amount_gallons DECIMAL(10, 3) DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
          CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_transactions_employee ON transactions(employee_name);
        `);

        console.log('  ✅ Created transactions table with UUID');
      }
    }

    // 5. ESTIMATES TABLE
    console.log('\n📝 Migrating estimates table...');
    if (await tableExists('estimates')) {
      const idType = await getColumnType('estimates', 'id');

      if (idType === 'integer' || idType === 'bigint') {
        console.log('  Converting estimates from integer to UUID...');

        await client.query(`
          ALTER TABLE estimates
          DROP CONSTRAINT IF EXISTS estimates_pkey CASCADE,
          DROP CONSTRAINT IF EXISTS estimates_customer_fkey CASCADE
        `);

        await client.query(`
          ALTER TABLE estimates
          ALTER COLUMN id DROP DEFAULT,
          ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
          ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
          ALTER COLUMN customer_id TYPE UUID USING uuid_generate_v4()
        `);

        await client.query(`
          ALTER TABLE estimates ADD PRIMARY KEY (id)
        `);

        await client.query(`
          ALTER TABLE estimates
          ADD CONSTRAINT estimates_customer_fkey
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        `);

        console.log('  ✅ Estimates table converted to UUID');
      } else {
        console.log('  ✅ Estimates table already uses UUID (skipped)');
      }
    }

    // 6. JOBS TABLE
    console.log('\n💼 Migrating jobs table...');
    if (await tableExists('jobs')) {
      const idType = await getColumnType('jobs', 'id');

      if (idType === 'integer' || idType === 'bigint') {
        console.log('  Converting jobs from integer to UUID...');

        await client.query(`
          ALTER TABLE jobs
          DROP CONSTRAINT IF EXISTS jobs_pkey CASCADE,
          DROP CONSTRAINT IF EXISTS jobs_customer_fkey CASCADE,
          DROP CONSTRAINT IF EXISTS jobs_estimate_fkey CASCADE
        `);

        await client.query(`
          ALTER TABLE jobs
          ALTER COLUMN id DROP DEFAULT,
          ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
          ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
          ALTER COLUMN customer_id TYPE UUID USING uuid_generate_v4(),
          ALTER COLUMN estimate_id TYPE UUID USING uuid_generate_v4()
        `);

        await client.query(`
          ALTER TABLE jobs ADD PRIMARY KEY (id)
        `);

        await client.query(`
          ALTER TABLE jobs
          ADD CONSTRAINT jobs_customer_fkey
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
          ADD CONSTRAINT jobs_estimate_fkey
          FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE SET NULL
        `);

        console.log('  ✅ Jobs table converted to UUID');
      } else {
        console.log('  ✅ Jobs table already uses UUID (skipped)');
      }
    }

    // 7. INVOICES TABLE
    console.log('\n🧾 Migrating invoices table...');
    if (await tableExists('invoices')) {
      const idType = await getColumnType('invoices', 'id');

      if (idType === 'integer' || idType === 'bigint') {
        console.log('  Converting invoices from integer to UUID...');

        await client.query(`
          ALTER TABLE invoices
          DROP CONSTRAINT IF EXISTS invoices_pkey CASCADE,
          DROP CONSTRAINT IF EXISTS invoices_customer_fkey CASCADE,
          DROP CONSTRAINT IF EXISTS invoices_job_fkey CASCADE,
          DROP CONSTRAINT IF EXISTS invoices_estimate_fkey CASCADE
        `);

        await client.query(`
          ALTER TABLE invoices
          ALTER COLUMN id DROP DEFAULT,
          ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
          ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
          ALTER COLUMN customer_id TYPE UUID USING uuid_generate_v4(),
          ALTER COLUMN job_id TYPE UUID USING uuid_generate_v4(),
          ALTER COLUMN estimate_id TYPE UUID USING uuid_generate_v4()
        `);

        await client.query(`
          ALTER TABLE invoices ADD PRIMARY KEY (id)
        `);

        await client.query(`
          ALTER TABLE invoices
          ADD CONSTRAINT invoices_customer_fkey
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
          ADD CONSTRAINT invoices_job_fkey
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          ADD CONSTRAINT invoices_estimate_fkey
          FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE SET NULL
        `);

        console.log('  ✅ Invoices table converted to UUID');
      } else {
        console.log('  ✅ Invoices table already uses UUID (skipped)');
      }
    }

    // 8. SERVICES TABLE
    console.log('\n🔧 Migrating services table...');
    if (await tableExists('services')) {
      const idType = await getColumnType('services', 'id');

      if (idType === 'integer' || idType === 'bigint') {
        console.log('  Converting services from integer to UUID...');

        await client.query(`
          ALTER TABLE services
          DROP CONSTRAINT IF EXISTS services_pkey CASCADE
        `);

        await client.query(`
          ALTER TABLE services
          ALTER COLUMN id DROP DEFAULT,
          ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
          ALTER COLUMN id SET DEFAULT uuid_generate_v4()
        `);

        await client.query(`
          ALTER TABLE services ADD PRIMARY KEY (id)
        `);

        console.log('  ✅ Services table converted to UUID');
      } else {
        console.log('  ✅ Services table already uses UUID (skipped)');
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ Transaction committed\n');

    // Verify all tables
    console.log('📋 Verifying database schema...\n');
    const tables = ['users', 'customers', 'products', 'transactions', 'estimates', 'jobs', 'invoices', 'services'];

    for (const table of tables) {
      if (await tableExists(table)) {
        const idType = await getColumnType(table, 'id');
        const icon = idType === 'uuid' ? '✅' : '⚠️';
        console.log(`  ${icon} ${table}: id type = ${idType}`);
      } else {
        console.log(`  ⚠️  ${table}: table does not exist`);
      }
    }

    console.log('\n✅ Production database migration completed successfully!\n');
    console.log('⚠️  IMPORTANT: All existing IDs have been changed to UUIDs.');
    console.log('   Any external references to old IDs will need to be updated.\n');

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

migrateToUuid()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Migration script failed:', err);
    process.exit(1);
  });
