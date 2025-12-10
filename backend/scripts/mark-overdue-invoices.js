import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Use same connection strategy as other scripts (supports DATABASE_URL or explicit params)
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

async function markOverdueInvoices() {
  try {
    await client.connect();
    console.log('Connected to database');

    const result = await client.query(
      `UPDATE invoices
       SET status = 'overdue',
           updated_at = NOW()
       WHERE status IN ('sent', 'unpaid')
         AND due_date IS NOT NULL
         AND paid_date IS NULL
         AND due_date < NOW()`
    );

    console.log(`Updated ${result.rowCount} invoice(s) to overdue status.`);
  } catch (error) {
    console.error('Error marking overdue invoices:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

markOverdueInvoices();
