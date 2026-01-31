import { query } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupActivityLogs() {
  try {
    console.log('Creating activity_logs table...');

    const sqlPath = path.join(__dirname, '../schema/activity_logs.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await query(sql);

    console.log('✓ Activity logs table created successfully!');
    console.log('\nTable structure:');
    console.log('- id: UUID (primary key)');
    console.log('- entity_type: estimate | invoice');
    console.log('- entity_id: UUID of the estimate/invoice');
    console.log('- activity_type: created | updated | sent | viewed | accepted | rejected');
    console.log('- user_id: UUID (nullable, admin user who performed action)');
    console.log('- user_name: String (display name)');
    console.log('- metadata: JSONB (additional data)');
    console.log('- created_at: Timestamp');
    console.log('\nIndexes created:');
    console.log('- idx_activity_logs_entity (entity_type, entity_id)');
    console.log('- idx_activity_logs_created_at (created_at DESC)');
    console.log('- idx_activity_logs_activity_type (activity_type)');

    process.exit(0);
  } catch (error) {
    console.error('Error setting up activity logs:', error);
    process.exit(1);
  }
}

setupActivityLogs();
