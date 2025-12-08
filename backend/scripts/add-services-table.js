import pool from '../config/database.js';

const addServicesTable = async () => {
  try {
    console.log('Starting services table migration...');

    // Create services table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        cost DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Services table created');

    // Create index on name for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);
    `);
    console.log('✓ Index on services.name created');

    console.log('\n✅ Services table migration completed successfully!');
    console.log('\nNote: Line items in invoices and estimates will now reference service_id');
    console.log('You can now import services from QuickBooks or create them manually.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

addServicesTable();
