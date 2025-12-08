/**
 * Extract UUID from a Global ID (GID)
 * Converts "gid://matson-bros/Customer/76653589c23b4c2fb821be144cc2f752" to "76653589c23b4c2fb821be144cc2f752"
 * If the ID is already a UUID (no gid:// prefix), returns it as-is
 */
export function extractUuid(gid) {
  if (!gid) return gid;
  if (!gid.startsWith('gid://')) return gid;

  const parts = gid.split('/');
  return parts[parts.length - 1];
}

/**
 * Create a Global ID (GID) from a type and UUID
 * Converts ("Customer", "76653589c23b4c2fb821be144cc2f752") to "gid://matson-bros/Customer/76653589c23b4c2fb821be144cc2f752"
 */
export function toGid(type, uuid) {
  if (!uuid) return uuid;
  if (uuid.startsWith('gid://')) return uuid;

  return `gid://matson-bros/${type}/${uuid}`;
}
