import { toGid, extractId, integerToUuidPrefix, parseGid } from './gid.js';

/**
 * Transform a database row to include GID-formatted IDs
 * @param {object} row - The database row
 * @param {string} objectName - The object type (e.g., 'Customer', 'Job')
 * @param {object} options - Additional options
 * @param {string[]} options.foreignKeys - Array of foreign key field names to transform
 * @returns {object} Transformed row with GID-formatted IDs
 */
export const toGidFormat = (row, objectName, options = {}) => {
  if (!row) return null;

  const { foreignKeys = [] } = options;
  const transformed = {
    ...row,
    id: toGid(objectName, row.id),
  };

  // Transform foreign key IDs to GIDs
  foreignKeys.forEach(fkField => {
    if (row[fkField]) {
      // Determine the object type from the field name
      // e.g., customer_id -> Customer, job_id -> Job
      const fkType = fkField
        .replace('_id', '')
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');

      transformed[fkField] = toGid(fkType, row[fkField]);
    }
  });

  return transformed;
};

/**
 * Extract UUID/integer from GID for database queries
 * For UUID-based entities: Returns hex prefix for LIKE queries
 * For integer-based entities (User): Returns integer directly
 * @param {string} gidOrId - The Global ID or raw ID
 * @returns {string} The hex prefix or integer for database queries
 */
export const extractUuidForQuery = (gidOrId) => {
  // If it's not a GID, return as-is
  if (!gidOrId || !gidOrId.startsWith('gid://')) {
    return gidOrId;
  }

  const integerId = extractId(gidOrId);
  const { objectName } = parseGid(gidOrId);

  // For User type (integer-based), return integer without leading zeros
  if (objectName === 'User') {
    return parseInt(integerId, 10).toString();
  }

  // For UUID-based types, convert to hex prefix
  return integerToUuidPrefix(integerId);
};

/**
 * Build a WHERE clause for querying by GID
 * @param {string} gid - The Global ID
 * @param {string} columnName - The column name (default: 'id')
 * @returns {object} Object with whereClause and params
 */
export const buildGidWhereClause = (gid, columnName = 'id') => {
  const { hexPrefix } = extractUuidForQuery(gid);

  return {
    whereClause: `REPLACE(${columnName}::text, '-', '') LIKE $1`,
    param: `${hexPrefix}%`,
  };
};

/**
 * Transform an array of database rows to GID format
 * @param {object[]} rows - Array of database rows
 * @param {string} objectName - The object type
 * @param {object} options - Additional options (same as toGidFormat)
 * @returns {object[]} Array of transformed rows
 */
export const toGidFormatArray = (rows, objectName, options = {}) => {
  return rows.map(row => toGidFormat(row, objectName, options));
};

/**
 * Extract UUID from a GID or return it if it's already a UUID
 * Handles backward compatibility
 * @param {string} idOrGid - Either a GID or a raw UUID
 * @returns {object} Query parameters for database lookup
 */
export const extractForQuery = (idOrGid) => {
  if (idOrGid.startsWith('gid://')) {
    return extractUuidForQuery(idOrGid);
  }

  // If it's already a UUID, return it directly
  return {
    uuid: idOrGid,
    isDirectUuid: true,
  };
};

export default {
  toGidFormat,
  toGidFormatArray,
  extractUuidForQuery,
  buildGidWhereClause,
  extractForQuery,
};
