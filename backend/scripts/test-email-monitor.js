import dotenv from 'dotenv';
import { monitorInvoiceEmails, testEmailConnection } from '../services/emailMonitorService.js';

dotenv.config();

async function testEmailMonitor() {
  console.log('='.repeat(60));
  console.log('Testing Email Monitor Service');
  console.log('='.repeat(60));
  console.log('');

  // Display configuration (without showing password)
  console.log('Configuration:');
  console.log(`  IMAP Host: ${process.env.IMAP_HOST || process.env.EMAIL_HOST || 'imap.gmail.com'}`);
  console.log(`  IMAP Port: ${process.env.IMAP_PORT || process.env.EMAIL_PORT || '993'}`);
  console.log(`  IMAP User: ${process.env.IMAP_USER || process.env.EMAIL_USER}`);
  console.log(`  IMAP Password: ${process.env.IMAP_PASSWORD || process.env.EMAIL_PASSWORD ? '***configured***' : '***NOT SET***'}`);
  console.log(`  Supplier Email: ${process.env.SUPPLIER_EMAIL}`);
  console.log('');

  // First test connection
  console.log('Step 1: Testing IMAP connection...');
  console.log('-'.repeat(60));
  try {
    await testEmailConnection();
    console.log('✅ Connection test successful!');
  } catch (error) {
    console.error('❌ Connection test failed:', error.message || error);
    console.log('');
    console.log('Troubleshooting tips:');
    console.log('  1. Make sure IMAP is enabled in Gmail settings');
    console.log('  2. Verify your App Password is correct');
    console.log('  3. Check that IMAP_HOST=imap.gmail.com and IMAP_PORT=993');
    process.exit(1);
  }

  console.log('');
  console.log('Step 2: Monitoring for invoice emails...');
  console.log('-'.repeat(60));

  try {
    const result = await monitorInvoiceEmails();
    console.log('');
    console.log('✅ Email monitoring completed!');
    console.log('');
    console.log('Results:');
    console.log(`  Status: ${result.status}`);
    console.log(`  Emails processed: ${result.processed || 0}`);

    if (result.messages && result.messages.length > 0) {
      console.log('');
      console.log('Messages:');
      result.messages.forEach((msg, idx) => {
        console.log(`  ${idx + 1}. ${JSON.stringify(msg, null, 2)}`);
      });
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('Test completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('');
    console.error('❌ Email monitoring failed:');
    console.error(error);
    process.exit(1);
  }
}

testEmailMonitor();
