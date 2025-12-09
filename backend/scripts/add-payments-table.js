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

async function addPaymentsTable() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        payment_method VARCHAR(50) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_date TIMESTAMP DEFAULT NOW(),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Created payments table');

    // Create payment_invoices junction table to track which invoices were paid
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
        invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
        amount_applied DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Created payment_invoices junction table');

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
      CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
      CREATE INDEX IF NOT EXISTS idx_payment_invoices_payment_id ON payment_invoices(payment_id);
      CREATE INDEX IF NOT EXISTS idx_payment_invoices_invoice_id ON payment_invoices(invoice_id);
    `);
    console.log('✓ Created indexes');

    console.log('\n✅ Payments tables created successfully!');
  } catch (error) {
    console.error('Error creating payments tables:', error);
  } finally {
    await client.end();
  }
}

addPaymentsTable();
