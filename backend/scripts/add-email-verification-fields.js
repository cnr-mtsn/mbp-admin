import pool from '../config/database.js';

const addEmailVerificationFields = async () => {
  const client = await pool.connect();

  try {
    console.log('Starting email verification fields migration...\n');

    await client.query('BEGIN');

    // Add email verification columns
    console.log('Adding email verification columns to users table...');
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
    `);
    console.log('✓ Email verification columns added');

    // Set all existing users as verified (no disruption to current users)
    console.log('\nMarking existing users as verified...');
    const result = await client.query(`
      UPDATE users
      SET email_verified = TRUE
      WHERE email_verified IS NULL OR email_verified = FALSE;
    `);
    console.log(`✓ ${result.rowCount} existing users marked as verified`);

    // Create index for faster token lookup
    console.log('\nCreating index on verification_token column...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
    `);
    console.log('✓ Index created on verification_token column');

    await client.query('COMMIT');

    console.log('\n✅ Email verification fields migration completed successfully!');
    console.log('\nSummary:');
    console.log('- Added email_verified (BOOLEAN)');
    console.log('- Added verification_token (VARCHAR(255))');
    console.log('- Added verification_token_expires (TIMESTAMP)');
    console.log('- Created index on verification_token');
    console.log(`- Marked ${result.rowCount} existing users as verified`);

    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error);
    console.error('\nRolling back changes...');
    process.exit(1);
  } finally {
    client.release();
  }
};

addEmailVerificationFields();
