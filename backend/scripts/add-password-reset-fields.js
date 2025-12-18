import pool from '../config/database.js';

const addPasswordResetFields = async () => {
  try {
    console.log('Adding password reset fields to users table...');

    // Add reset_token and reset_token_expires columns
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
    `);
    console.log('✓ Password reset columns added');

    // Create index for faster token lookup
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
    `);
    console.log('✓ Index created on reset_token column');

    console.log('\n✅ Password reset fields migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

addPasswordResetFields();
