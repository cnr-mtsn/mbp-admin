const NAMESPACE = 'gid://matson-bros';

/**
 * Convert UUID to an integer string (13-16 digits)
 * Uses first 13 hex characters and converts to base 10 (produces 13-16 digits)
 * @param {string} id - The UUID string to convert
 * @returns {string} A 13-16 digit integer string
 */
const uuidToInteger = (id) => {
  // Remove hyphens from UUID
  const cleanUuid = id.replace(/-/g, '');

  // Take first 13 hex characters and convert to base 10
  // This gives us a number in the range of 0 to 4,503,599,627,370,495 (up to 16 digits)
  const hexSubstring = cleanUuid.substring(0, 13);
  const integer = parseInt(hexSubstring, 16);

  // Ensure it's at least 13 digits by padding if necessary
  return integer.toString().padStart(13, '0');
};

/**
 * Convert an integer back to the original UUID
 * This requires storing the original UUID in the database
 * @param {string} integer - The integer (13-16 digits)
 * @param {string} fullUuid - The full UUID from database (for validation/reconstruction)
 * @returns {string} The UUID
 */
const integerToUuid = (integer, fullUuid = null) => {
  // If we have the full UUID from database, return it
  if (fullUuid) {
    return fullUuid;
  }

  // Otherwise, we can't fully reconstruct the UUID from just the integer
  // This is why we need to query the database with the GID to get the full UUID
  throw new Error('Cannot reconstruct full UUID from integer alone. Query database with GID.');
};

/**
 * Generate a Global ID in the format: gid://matson-bros/<ObjectName>/<integer>
 * @param {string} objectName - The type of object (e.g., 'Customer', 'Invoice', 'Job')
 * @param {string} uuid - The UUID from the database
 * @returns {string} The formatted Global ID (with 13-16 digit integer)
 */
export const generateGid = (objectName, uuid) => {
  const integer = uuidToInteger(uuid);
  return `${NAMESPACE}/${objectName}/${integer}`;
};

/**
 * Parse a Global ID to extract the object type and integer ID
 * @param {string} gid - The Global ID to parse
 * @returns {object} Object containing objectName and integerId
 * @throws {Error} If the GID format is invalid
 */
export const parseGid = (gid) => {
  if (!gid || typeof gid !== 'string') {
    throw new Error('Invalid GID: must be a non-empty string');
  }

  const parts = gid.split('/');

  if (parts.length !== 5 || parts[0] !== 'gid:' || parts[2] !== 'matson-bros') {
    throw new Error(`Invalid GID format: ${gid}. Expected format: gid://matson-bros/<ObjectName>/<IntegerId>`);
  }

  const integerId = parts[4];

  // Validate that it's a numeric ID (13-16 digits from hex conversion)
  // 13 hex characters can produce up to 16 decimal digits
  if (!/^\d{13,16}$/.test(integerId)) {
    throw new Error(`Invalid GID: ID must be a 13-16 digit integer, got: ${integerId}`);
  }

  return {
    objectName: parts[3],
    integerId: integerId,
  };
};

/**
 * Extract just the integer ID from a Global ID
 * Note: This returns the integer (13-16 digits), not the original UUID
 * To query the database, you need to search by this integer representation
 * @param {string} gid - The Global ID
 * @returns {string} The integer ID (13-16 digits)
 */
export const extractId = (gid) => {
  const { integerId } = parseGid(gid);
  return integerId;
};

/**
 * Convert a database UUID to a Global ID
 * @param {string} objectName - The type of object
 * @param {string} uuid - The UUID from the database
 * @returns {string} The formatted Global ID
 */
export const toGid = (objectName, uuid) => {
  return generateGid(objectName, uuid);
};

/**
 * Convert integer ID back to UUID for database queries
 * Since we can't reconstruct the full UUID from the integer alone,
 * we need to query the database using the integer representation
 * @param {string} integerId - The integer from the GID (13-16 digits)
 * @returns {string} The hex substring that can be used in a LIKE query
 */
export const integerToUuidPrefix = (integerId) => {
  // Convert the 13-digit integer back to hex (13 characters)
  const integer = BigInt(integerId);
  const hexPrefix = integer.toString(16).padStart(13, '0');
  return hexPrefix;
};

/**
 * Validate if a string is a valid Global ID
 * @param {string} gid - The string to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidGid = (gid) => {
  try {
    parseGid(gid);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Check if a GID matches a specific object type
 * @param {string} gid - The Global ID
 * @param {string} expectedType - The expected object type
 * @returns {boolean} True if the GID is for the expected type
 */
export const isGidType = (gid, expectedType) => {
  try {
    const { objectName } = parseGid(gid);
    return objectName === expectedType;
  } catch (error) {
    return false;
  }
};

/**
 * Extract UUID from a GID for database queries
 * Converts the GID's integer back to a hex prefix that can match UUIDs
 * @param {string} gid - The Global ID
 * @returns {string} The hex prefix for UUID matching (13 characters)
 */
export const extractUuid = (gid) => {
  // If it's not a GID, assume it's already a UUID and return as-is (backward compatibility)
  if (!gid) {
    return gid;
  }

  // If we receive just the numeric portion of the GID, convert it back to a UUID hex prefix
  if (/^\d+$/.test(gid)) {
    return integerToUuidPrefix(gid);
  }

  if (!gid.startsWith('gid://')) {
    // Strip hyphens so we can use it in LIKE queries against REPLACE(id::text, '-', '')
    return gid.replace(/-/g, '');
  }

  const { integerId } = parseGid(gid);

  // All types use UUID-based IDs, convert integer back to hex prefix
  return integerToUuidPrefix(integerId);
};

export default {
  generateGid,
  parseGid,
  extractId,
  extractUuid,
  toGid,
  integerToUuidPrefix,
  isValidGid,
  isGidType,
};
