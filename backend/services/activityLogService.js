import { query } from '../config/database.js';

/**
 * Log an activity for an invoice or estimate
 * @param {Object} params - Activity log parameters
 * @param {string} params.entityType - 'invoice' or 'estimate'
 * @param {string} params.entityId - UUID of the invoice or estimate
 * @param {string} params.activityType - 'created', 'updated', 'sent', 'viewed', 'accepted', 'rejected'
 * @param {string} [params.userId] - UUID of admin user (optional, for admin actions)
 * @param {string} [params.userName] - Display name for the activity
 * @param {Object} [params.metadata] - Additional data (IP, user agent, etc.)
 */
export const logActivity = async ({
  entityType,
  entityId,
  activityType,
  userId = null,
  userName = null,
  metadata = {}
}) => {
  try {
    await query(
      `INSERT INTO activity_logs (entity_type, entity_id, activity_type, user_id, user_name, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [entityType, entityId, activityType, userId, userName, JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging shouldn't break the main operation
  }
};

/**
 * Get activity logs for a specific entity
 * @param {string} entityType - 'invoice' or 'estimate'
 * @param {string} entityId - UUID of the entity
 * @returns {Array} Activity logs ordered by created_at DESC
 */
export const getActivityLogs = async (entityType, entityId) => {
  const result = await query(
    `SELECT * FROM activity_logs
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY created_at DESC`,
    [entityType, entityId]
  );

  return result.rows.map(row => ({
    ...row,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
  }));
};

/**
 * Get recent activity across all entities
 * @param {number} limit - Maximum number of logs to return
 * @returns {Array} Recent activity logs
 */
export const getRecentActivity = async (limit = 50) => {
  const result = await query(
    `SELECT * FROM activity_logs
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows.map(row => ({
    ...row,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
  }));
};
