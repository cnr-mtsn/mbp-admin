import pg from 'pg';
const { Pool } = pg;

/**
 * Migration script for Render database
 * This updates the production database with new billing tables and services table
 *
 * Run this AFTER deploying to Render:
 * node scripts/migrate-render-db.js
 */

// Use DATABASE_URL from environment (Render sets this automatically)
// SSL is always required for Render databases
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DB_URL,
  ssl: { rejectUnauthorized: false }
});

const migrateDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting Render database migration...\n');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✓ UUID extension enabled');

    // Check if tables already exist
    const checkTable = async (tableName) => {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [tableName]);
      return result.rows[0].exists;
    };

    // 1. CUSTOMERS TABLE
    const customersExists = await checkTable('customers');
    if (!customersExists) {
      await client.query(`
        CREATE TABLE customers (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          company_name VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(50),
          zip VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✓ Created customers table');
    } else {
      // Check if company_name column exists, add if missing
      const result = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'company_name';
      `);

      if (result.rows.length === 0) {
        await client.query('ALTER TABLE customers ADD COLUMN company_name VARCHAR(255);');
        console.log('✓ Added company_name column to customers');
      } else {
        console.log('✓ Customers table already exists (skipped)');
      }
    }

    // 2. SERVICES TABLE (New for billing)
    const servicesExists = await checkTable('services');
    if (!servicesExists) {
      await client.query(`
        CREATE TABLE services (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          cost DECIMAL(10, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query('CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);');
      console.log('✓ Created services table');
    } else {
      console.log('✓ Services table already exists (skipped)');
    }

    // 3. ESTIMATES TABLE
    const estimatesExists = await checkTable('estimates');
    if (!estimatesExists) {
      await client.query(`
        CREATE TABLE estimates (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          line_items JSONB DEFAULT '[]',
          subtotal DECIMAL(10, 2),
          tax DECIMAL(10, 2),
          total DECIMAL(10, 2) NOT NULL,
          notes TEXT,
          status VARCHAR(50) DEFAULT 'draft',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✓ Created estimates table');
    } else {
      console.log('✓ Estimates table already exists (skipped)');
    }

    // 4. JOBS TABLE
    const jobsExists = await checkTable('jobs');
    if (!jobsExists) {
      await client.query(`
        CREATE TABLE jobs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
          estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(50),
          zip VARCHAR(20),
          total_amount DECIMAL(10, 2) NOT NULL,
          payment_schedule VARCHAR(50) DEFAULT '50/40/10',
          status VARCHAR(50) DEFAULT 'pending',
          start_date DATE,
          completion_date DATE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✓ Created jobs table');
    } else {
      console.log('✓ Jobs table already exists (skipped)');
    }

    // 5. INVOICES TABLE
    const invoicesExists = await checkTable('invoices');
    if (!invoicesExists) {
      await client.query(`
        CREATE TABLE invoices (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
          job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
          estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
          invoice_number VARCHAR(50) UNIQUE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          line_items JSONB DEFAULT '[]',
          subtotal DECIMAL(10, 2),
          tax DECIMAL(10, 2),
          total DECIMAL(10, 2) NOT NULL,
          payment_stage VARCHAR(50),
          percentage INTEGER,
          due_date DATE,
          paid_date DATE,
          payment_method VARCHAR(50),
          notes TEXT,
          status VARCHAR(50) DEFAULT 'unpaid',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✓ Created invoices table');
    } else {
      console.log('✓ Invoices table already exists (skipped)');
    }

    // Verify all tables exist
    console.log('\n📋 Verifying database schema...');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\nExisting tables:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

    console.log('\n✅ Database migration completed successfully!');
    console.log('\n📌 Next steps:');
    console.log('1. Both inventory and billing apps can now use this database');
    console.log('2. Import your services data if needed');
    console.log('3. Test the billing app on Render');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\nError details:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

migrateDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
