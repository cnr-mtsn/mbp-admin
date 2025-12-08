import pool from '../config/database.js';

const addNameFields = async () => {
  try {
    console.log('Adding first_name and last_name columns to users table...');

    // Add first_name column if it doesn't exist
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(255)
    `);

    console.log('✅ Name fields added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add name fields:', error);
    process.exit(1);
  }
};

addNameFields();
