import pool from '../config/database.js';

const checkUsersTable = async () => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Users table structure:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    const sample = await pool.query('SELECT id FROM users LIMIT 1');
    if (sample.rows.length > 0) {
      console.log('\nSample id:', sample.rows[0].id, 'Type:', typeof sample.rows[0].id);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
};

checkUsersTable();
