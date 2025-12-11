import { query } from '../config/database.js';

/**
 * Script to set a user's role to superadmin
 * Usage: node scripts/set-superadmin.js <email>
 */

async function setSuperadmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('Error: Email address required');
    console.log('Usage: node scripts/set-superadmin.js <email>');
    process.exit(1);
  }

  try {
    // Check if user exists
    const userCheck = await query('SELECT id, email, role FROM users WHERE email = $1', [email]);

    if (userCheck.rows.length === 0) {
      console.error(`Error: User with email "${email}" not found`);
      process.exit(1);
    }

    const user = userCheck.rows[0];
    console.log(`Found user: ${user.email} (current role: ${user.role})`);

    // Update role to superadmin
    await query('UPDATE users SET role = $1, updated_at = NOW() WHERE email = $2', ['superadmin', email]);

    console.log(`✓ Successfully updated ${email} to superadmin role`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating user role:', error);
    process.exit(1);
  }
}

setSuperadmin();
