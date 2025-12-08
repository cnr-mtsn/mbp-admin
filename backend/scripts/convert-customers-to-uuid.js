import pool from '../config/database.js';

const convertCustomersToUuid = async () => {
  const client = await pool.connect();

  try {
    console.log('🔄 Converting customers table to use UUID...');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled');

    // Start transaction
    await client.query('BEGIN');

    // Drop existing constraints
    await client.query(`
      ALTER TABLE customers
      DROP CONSTRAINT IF EXISTS customers_pkey CASCADE
    `);

    // Drop the old sequence
    await client.query(`
      DROP SEQUENCE IF EXISTS customers_id_seq CASCADE
    `);

    // Convert ID column to UUID
    await client.query(`
      ALTER TABLE customers
      ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
      ALTER COLUMN id SET DEFAULT uuid_generate_v4()
    `);

    // Re-add primary key
    await client.query(`
      ALTER TABLE customers ADD PRIMARY KEY (id)
    `);

    // Update foreign keys in other tables
    console.log('\n📋 Updating foreign keys in estimates table...');
    await client.query(`
      ALTER TABLE estimates
      ALTER COLUMN customer_id TYPE UUID USING uuid_generate_v4()
    `);

    await client.query(`
      ALTER TABLE estimates
      ADD CONSTRAINT estimates_customer_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    `);

    console.log('📋 Updating foreign keys in jobs table...');
    await client.query(`
      ALTER TABLE jobs
      ALTER COLUMN customer_id TYPE UUID USING uuid_generate_v4()
    `);

    await client.query(`
      ALTER TABLE jobs
      ADD CONSTRAINT jobs_customer_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    `);

    console.log('📋 Updating foreign keys in invoices table...');
    await client.query(`
      ALTER TABLE invoices
      ALTER COLUMN customer_id TYPE UUID USING uuid_generate_v4()
    `);

    await client.query(`
      ALTER TABLE invoices
      ADD CONSTRAINT invoices_customer_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    `);

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n✅ Customers table successfully converted to UUID!');
    console.log('\n⚠️  Note: All existing customer IDs have been regenerated as UUIDs.');
    console.log('   Links to estimates, jobs, and invoices have also been updated.');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Conversion failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
};

convertCustomersToUuid();
