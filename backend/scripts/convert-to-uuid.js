import pool from '../config/database.js';

const convertToUuid = async () => {
  const client = await pool.connect();

  try {
    console.log('🔄 Converting tables to use UUID...');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled');

    // Start transaction
    await client.query('BEGIN');

    // Convert customers table
    console.log('\n📋 Converting customers table...');
    await client.query(`
      ALTER TABLE customers
      DROP CONSTRAINT IF EXISTS customers_pkey CASCADE
    `);

    await client.query(`
      ALTER TABLE customers
      ALTER COLUMN id DROP DEFAULT,
      ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
      ALTER COLUMN id SET DEFAULT uuid_generate_v4()
    `);

    await client.query(`
      ALTER TABLE customers ADD PRIMARY KEY (id)
    `);
    console.log('✅ Customers table converted');

    // Convert estimates table
    console.log('\n📋 Converting estimates table...');
    await client.query(`
      ALTER TABLE estimates
      DROP CONSTRAINT IF EXISTS estimates_pkey CASCADE
    `);

    await client.query(`
      ALTER TABLE estimates
      ALTER COLUMN id DROP DEFAULT,
      ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
      ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
      ALTER COLUMN customer_id TYPE UUID USING uuid_generate_v4()
    `);

    await client.query(`
      ALTER TABLE estimates ADD PRIMARY KEY (id)
    `);

    await client.query(`
      ALTER TABLE estimates
      ADD CONSTRAINT estimates_customer_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    `);
    console.log('✅ Estimates table converted');

    // Convert jobs table
    console.log('\n📋 Converting jobs table...');
    await client.query(`
      ALTER TABLE jobs
      DROP CONSTRAINT IF EXISTS jobs_pkey CASCADE
    `);

    await client.query(`
      ALTER TABLE jobs
      ALTER COLUMN id DROP DEFAULT,
      ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
      ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
      ALTER COLUMN customer_id TYPE UUID USING uuid_generate_v4(),
      ALTER COLUMN estimate_id TYPE UUID USING uuid_generate_v4()
    `);

    await client.query(`
      ALTER TABLE jobs ADD PRIMARY KEY (id)
    `);

    await client.query(`
      ALTER TABLE jobs
      ADD CONSTRAINT jobs_customer_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      ADD CONSTRAINT jobs_estimate_fkey
      FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE SET NULL
    `);
    console.log('✅ Jobs table converted');

    // Convert invoices table
    console.log('\n📋 Converting invoices table...');
    await client.query(`
      ALTER TABLE invoices
      DROP CONSTRAINT IF EXISTS invoices_pkey CASCADE
    `);

    await client.query(`
      ALTER TABLE invoices
      ALTER COLUMN id DROP DEFAULT,
      ALTER COLUMN id TYPE UUID USING uuid_generate_v4(),
      ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
      ALTER COLUMN customer_id TYPE UUID USING uuid_generate_v4(),
      ALTER COLUMN job_id TYPE UUID USING uuid_generate_v4(),
      ALTER COLUMN estimate_id TYPE UUID USING uuid_generate_v4()
    `);

    await client.query(`
      ALTER TABLE invoices ADD PRIMARY KEY (id)
    `);

    await client.query(`
      ALTER TABLE invoices
      ADD CONSTRAINT invoices_customer_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      ADD CONSTRAINT invoices_job_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      ADD CONSTRAINT invoices_estimate_fkey
      FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE SET NULL
    `);
    console.log('✅ Invoices table converted');

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n✅ All tables successfully converted to UUID!');
    console.log('\n⚠️  Note: This conversion will have changed all existing IDs.');
    console.log('   If you have existing data, you may need to re-link records.');

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

convertToUuid();
