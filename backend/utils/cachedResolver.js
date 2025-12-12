import cache from './cacheManager.js';

/**
 * Wrap a resolver with caching logic
 *
 * @param {Function} resolver - The original resolver function
 * @param {Object} options - Caching options
 * @param {string} options.operationName - Name for cache key generation
 * @param {Function} options.getTags - Function to generate tags from args/result
 * @param {number} options.ttl - TTL in milliseconds
 * @param {boolean} options.enabled - Whether caching is enabled (default: true)
 * @returns {Function} Wrapped resolver with caching
 */
export function cachedResolver(resolver, options = {}) {
  const {
    operationName,
    getTags = () => [],
    ttl = 300000, // 5 minutes
    enabled = true,
  } = options;

  // Bypass cache if disabled or via environment variable
  if (!enabled || process.env.DISABLE_CACHE === 'true') {
    return resolver;
  }

  return async (parent, args, context, info) => {
    // Generate cache key from operation name and args
    const cacheKey = cache.generateKey(operationName, args);

    // Try to get from cache
    const cached = cache.get(cacheKey);
    if (cached !== null) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Cache HIT] ${operationName}`, JSON.stringify(args).substring(0, 100));
      }
      return cached;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Cache MISS] ${operationName}`, JSON.stringify(args).substring(0, 100));
    }

    // Execute original resolver
    const result = await resolver(parent, args, context, info);

    // Generate tags for invalidation
    const tags = getTags(args, result);

    // Store in cache with tags
    cache.set(cacheKey, result, { ttl, tags });

    return result;
  };
}

/**
 * Invalidate cache by tags
 * Use this in mutations to clear related cached queries
 *
 * @param {string[]} tags - Array of tags to invalidate
 * @returns {number} Number of cache entries invalidated
 */
export function invalidateCache(tags) {
  const count = cache.invalidateTags(tags);

  if (process.env.NODE_ENV === 'development' && count > 0) {
    console.log(`[Cache INVALIDATE] ${count} entries cleared for tags:`, tags);
  }

  return count;
}

/**
 * Helper function to generate tags for a single entity
 * @param {string} entityType - Type of entity (e.g., 'job', 'invoice')
 * @param {string} id - Entity ID
 * @param {object} extraTags - Additional tags (e.g., { customer_id: '123' })
 * @returns {string[]} Array of tags
 */
export function generateEntityTags(entityType, id, extraTags = {}) {
  const tags = [
    `${entityType}:all`,
    `${entityType}:${id}`,
  ];

  // Add relationship tags (e.g., job:customer:123)
  Object.entries(extraTags).forEach(([key, value]) => {
    if (value) {
      tags.push(`${entityType}:${key.replace('_id', '')}:${value}`);
    }
  });

  return tags;
}

/**
 * Helper function to generate tags for list queries
 * @param {string} entityType - Type of entity (e.g., 'job', 'invoice')
 * @param {object} filters - Query filters
 * @param {array} results - Query results to tag individual entities
 * @returns {string[]} Array of tags
 */
export function generateListTags(entityType, filters = {}, results = []) {
  const tags = [`${entityType}:all`];

  // Add filter-based tags
  if (filters.customer_id) {
    tags.push(`${entityType}:customer:${filters.customer_id}`);
  }
  if (filters.job_id) {
    tags.push(`${entityType}:job:${filters.job_id}`);
  }

  // Tag each individual result for granular invalidation
  results.forEach(result => {
    if (result.id) {
      tags.push(`${entityType}:${result.id}`);
    }
  });

  return tags;
}

export default {
  cachedResolver,
  invalidateCache,
  generateEntityTags,
  generateListTags,
};
