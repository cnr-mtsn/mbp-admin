import { extractId, integerToUuidPrefix, toGid } from './gid.js';

/**
 * Query database by GID (Optimized)
 * Uses the indexed gid_int column for fast O(log n) lookups
 * @param {Function} queryFn - The database query function
 * @param {string} tableName - The table to query
 * @param {string} gid - The Global ID
 * @returns {Promise<object>} The database row
 */
export const queryByGid = async (queryFn, tableName, gid) => {
  const integerId = extractId(gid);

  // Use the indexed gid_int column for fast lookup
  // This is much more efficient than the old LIKE query approach
  const result = await queryFn(
    `SELECT * FROM ${tableName} WHERE gid_int = $1`,
    [integerId]
  );

  return result.rows[0];
};

/**
 * Performance Notes:
 * - Each table has a generated column 'gid_int' that stores the 13-digit integer from GID
 * - Indexes on gid_int enable O(log n) lookups instead of O(n) LIKE scans
 * - Migration: backend/scripts/add-gid-columns.js
 */

export default {
  queryByGid,
};
