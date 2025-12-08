import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'matson_bros',
  user: 'cnrmtsn',
  password: '',
});

const checkGeneratedColumns = async () => {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking for generated columns...\n');

    const result = await client.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        is_generated,
        generation_expression
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND is_generated = 'ALWAYS'
      ORDER BY table_name, ordinal_position
    `);

    if (result.rows.length === 0) {
      console.log('✅ No generated columns found\n');
    } else {
      console.log(`Found ${result.rows.length} generated column(s):\n`);
      result.rows.forEach(row => {
        console.log(`📋 Table: ${row.table_name}`);
        console.log(`   Column: ${row.column_name} (${row.data_type})`);
        console.log(`   Expression: ${row.generation_expression || 'N/A'}`);
        console.log();
      });
    }

    // Also check for columns that might reference 'id'
    console.log('🔍 Checking columns that might depend on id column...\n');

    const tables = ['users', 'transactions', 'products', 'customers'];

    for (const table of tables) {
      const cols = await client.query(`
        SELECT column_name, column_default, data_type
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      if (cols.rows.length > 0) {
        console.log(`\n📋 ${table.toUpperCase()} columns:`);
        cols.rows.forEach(col => {
          console.log(`   ${col.column_name}: ${col.data_type}`);
          if (col.column_default) {
            console.log(`      default: ${col.column_default}`);
          }
        });
      }
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
};

checkGeneratedColumns();
