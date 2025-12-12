/**
 * Server-side cache manager with tag-based invalidation
 *
 * Features:
 * - TTL-based expiration
 * - Tag-based invalidation for automatic cache clearing on mutations
 * - LRU (Least Recently Used) eviction
 * - Cache statistics tracking
 */

class CacheManager {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000; // Max cache entries
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes in milliseconds
    this.cache = new Map(); // { key: { data, expires, tags, accessedAt } }
    this.tagIndex = new Map(); // { tag: Set<keys> }
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      invalidations: 0,
    };
  }

  /**
   * Generate cache key from operation name and variables
   * @param {string} operationName - Name of the GraphQL operation
   * @param {object} variables - Query variables
   * @returns {string} Cache key
   */
  generateKey(operationName, variables = {}) {
    // Sort keys for consistent cache keys
    const sortedVars = JSON.stringify(variables, Object.keys(variables).sort());
    return `${operationName}:${sortedVars}`;
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expires) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;

    // Update access time for LRU
    entry.accessedAt = Date.now();

    // Move to end (LRU - most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  /**
   * Set cache value with tags
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {object} options - Caching options
   * @param {number} options.ttl - TTL in milliseconds
   * @param {string[]} options.tags - Tags for invalidation
   */
  set(key, data, options = {}) {
    const ttl = options.ttl || this.defaultTTL;
    const tags = options.tags || [];

    // Evict oldest (LRU) if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.delete(firstKey);
      this.stats.evictions++;
    }

    const entry = {
      data,
      expires: Date.now() + ttl,
      tags: new Set(tags),
      accessedAt: Date.now(),
    };

    this.cache.set(key, entry);

    // Update tag index for invalidation
    tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag).add(key);
    });

    this.stats.sets++;
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   */
  delete(key) {
    const entry = this.cache.get(key);
    if (entry) {
      // Remove from tag index
      entry.tags.forEach(tag => {
        const keys = this.tagIndex.get(tag);
        if (keys) {
          keys.delete(key);
          if (keys.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      });
    }
    this.cache.delete(key);
  }

  /**
   * Invalidate all entries with a specific tag
   * @param {string} tag - Tag to invalidate
   * @returns {number} Number of entries invalidated
   */
  invalidateTag(tag) {
    const keys = this.tagIndex.get(tag);
    if (!keys) {
      return 0;
    }

    const count = keys.size;
    keys.forEach(key => this.delete(key));
    this.tagIndex.delete(tag);
    this.stats.invalidations += count;

    return count;
  }

  /**
   * Invalidate multiple tags
   * @param {string[]} tags - Tags to invalidate
   * @returns {number} Total number of entries invalidated
   */
  invalidateTags(tags) {
    let totalInvalidated = 0;
    tags.forEach(tag => {
      totalInvalidated += this.invalidateTag(tag);
    });
    return totalInvalidated;
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.tagIndex.clear();
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0
      ? (this.stats.hits / totalRequests * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize,
      tagCount: this.tagIndex.size,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      invalidations: 0,
    };
  }
}

// Singleton instance
const cache = new CacheManager({
  maxSize: 1000,
  defaultTTL: 300000, // 5 minutes
});

export default cache;
