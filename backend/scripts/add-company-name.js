import pool from '../config/database.js';

const addCompanyName = async () => {
  try {
    console.log('Adding company_name column to customers table...');

    // Add company_name column if it doesn't exist
    await pool.query(`
      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)
    `);

    console.log('✅ company_name field added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add company_name field:', error);
    process.exit(1);
  }
};

addCompanyName();
