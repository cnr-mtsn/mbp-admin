import pool from '../config/database.js';

const createTables = async () => {
  try {
    console.log('Starting database migration...');

    // Enable UUID extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✓ UUID extension enabled');

    // Users table already exists from inventory app - skip creation
    console.log('✓ Users table (shared with inventory app)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
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
    console.log('✓ Customers table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS estimates (
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
    console.log('✓ Estimates table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
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
    console.log('✓ Jobs table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
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
    console.log('✓ Invoices table created');

    console.log('\n✅ Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

createTables();
