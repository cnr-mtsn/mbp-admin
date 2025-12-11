import cron from 'node-cron';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { monitorInvoiceEmails } from './emailMonitorService.js';

dotenv.config();

// Use same connection strategy as scripts
const getClientConfig = () => {
  return process.env.DATABASE_URL || process.env.DB_URL
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
};

async function markOverdueInvoices() {
  const client = new Client(getClientConfig());

  try {
    await client.connect();
    console.log('[CRON] Connected to database for overdue invoice check');

    const result = await client.query(
      `UPDATE invoices
       SET status = 'overdue',
           updated_at = NOW()
       WHERE status IN ('sent', 'unpaid')
         AND due_date IS NOT NULL
         AND paid_date IS NULL
         AND due_date < NOW()`
    );

    console.log(`[CRON] Updated ${result.rowCount} invoice(s) to overdue status at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('[CRON] Error marking overdue invoices:', error);
  } finally {
    await client.end();
  }
}

export function initializeCronJobs() {
  // Schedule daily at midnight (00:00) - runs every day at 12:00 AM
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running mark-overdue-invoices job');
    await markOverdueInvoices();
  });

  // Schedule email monitor every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('[CRON] Running invoice email monitor job');
    try {
      const result = await monitorInvoiceEmails();
      console.log(`[CRON] Email monitor completed:`, result);
    } catch (error) {
      console.error('[CRON] Email monitor error:', error);
    }
  });

  console.log('✅ Cron jobs initialized:');
  console.log('  - mark-overdue-invoices: runs daily at 12:00 AM');
  console.log('  - invoice-email-monitor: runs every 30 minutes');
}
