import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Support both connection string (Render) and individual params (local dev)
const clientConfig = process.env.DATABASE_URL || process.env.DB_URL
  ? {
      connectionString: process.env.DATABASE_URL || process.env.DB_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

const client = new Client(clientConfig);

async function addExpensesTable() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create expenses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
        expense_type VARCHAR(50) NOT NULL DEFAULT 'materials',
        vendor VARCHAR(255),
        invoice_number VARCHAR(100),
        invoice_date DATE,
        po_number VARCHAR(100),
        description TEXT,
        line_items JSONB DEFAULT '[]',
        subtotal DECIMAL(10, 2),
        tax DECIMAL(10, 2),
        total DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        pdf_path VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending_review',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Created expenses table');

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_job_id ON expenses(job_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
      CREATE INDEX IF NOT EXISTS idx_expenses_invoice_date ON expenses(invoice_date);
      CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON expenses(vendor);
      CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
    `);
    console.log('✓ Created indexes');

    console.log('\n✅ Expenses table created successfully!');
  } catch (error) {
    console.error('Error creating expenses table:', error);
  } finally {
    await client.end();
  }
}

addExpensesTable();
