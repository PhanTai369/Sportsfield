/**
 * Cache Utilities
 * In-memory caching system to improve API performance
 */
const NodeCache = require('node-cache');
const logger = require('./logger');

// Create cache instance with default TTL of 10 minutes
const cache = new NodeCache({
  stdTTL: 600, // 10 minutes
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false // Don't clone objects when getting/setting (for performance)
});

/**
 * Set a value in cache
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {boolean} Success
 */
exports.set = (key, value, ttl = undefined) => {
  try {
    const success = cache.set(key, value, ttl);
    logger.debug(`Cache set: ${key}`, { ttl });
    return success;
  } catch (error) {
    logger.error(`Cache set failed for key: ${key}`, { error });
    return false;
  }
};

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {*} Cached value or undefined if not found
 */
exports.get = (key) => {
  try {
    const value = cache.get(key);
    if (value !== undefined) {
      logger.debug(`Cache hit: ${key}`);
    } else {
      logger.debug(`Cache miss: ${key}`);
    }
    return value;
  } catch (error) {
    logger.error(`Cache get failed for key: ${key}`, { error });
    return undefined;
  }
};

/**
 * Get a value from cache or set it if not found
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch the data if not in cache
 * @param {number} ttl - Time to live in seconds
 * @returns {*} Cached or fetched value
 */
exports.getOrSet = async (key, fetchFn, ttl = undefined) => {
  try {
    // Try to get from cache first
    const cachedValue = exports.get(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    // If not in cache, fetch the data
    logger.debug(`Cache miss, fetching data for key: ${key}`);
    const value = await fetchFn();
    
    // Set in cache for future requests
    exports.set(key, value, ttl);
    
    return value;
  } catch (error) {
    logger.error(`getOrSet failed for key: ${key}`, { error });
    throw error; // Re-throw to let the caller handle it
  }
};

/**
 * Remove a key from cache
 * @param {string} key - Cache key
 * @returns {number} Number of removed keys (0 or 1)
 */
exports.delete = (key) => {
  try {
    const count = cache.del(key);
    logger.debug(`Cache delete: ${key}`, { count });
    return count;
  } catch (error) {
    logger.error(`Cache delete failed for key: ${key}`, { error });
    return 0;
  }
};

/**
 * Remove multiple keys from cache
 * @param {Array<string>} keys - Cache keys to delete
 * @returns {number} Number of removed keys
 */
exports.deleteMany = (keys) => {
  try {
    const count = cache.del(keys);
    logger.debug(`Cache deleteMany: ${keys.length} keys`, { count });
    return count;
  } catch (error) {
    logger.error(`Cache deleteMany failed`, { error, keys });
    return 0;
  }
};

/**
 * Delete keys matching a pattern
 * @param {string} pattern - Pattern to match (supports * wildcard)
 * @returns {number} Number of removed keys
 */
exports.delPattern = (pattern) => {
  try {
    const keys = cache.keys();
    const matchingKeys = keys.filter(key => {
      // Simple pattern matching with * wildcard
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(key);
    });
    
    if (matchingKeys.length > 0) {
      const count = cache.del(matchingKeys);
      logger.debug(`Cache delPattern: ${pattern}`, { matchingKeys, count });
      return count;
    }
    
    return 0;
  } catch (error) {
    logger.error(`Cache delPattern failed for pattern: ${pattern}`, { error });
    return 0;
  }
};

/**
 * Clear all keys from cache
 * @returns {boolean} Success
 */
exports.clear = () => {
  try {
    cache.flushAll();
    logger.debug('Cache cleared');
    return true;
  } catch (error) {
    logger.error('Cache clear failed', { error });
    return false;
  }
};

/**
 * Get cache stats
 * @returns {Object} Cache statistics
 */
exports.getStats = () => {
  try {
    const stats = cache.getStats();
    const keys = cache.keys();
    return {
      ...stats,
      keys: keys.length,
      keyList: keys
    };
  } catch (error) {
    logger.error('Get cache stats failed', { error });
    return {};
  }
};

/**
 * Higher-order function that adds caching to a route handler
 * @param {string} keyPrefix - Prefix for the cache key
 * @param {Function} keyFn - Function to generate unique key from request
 * @param {number} ttl - Time to live in seconds
 * @returns {Function} Express middleware function
 */
exports.cacheMiddleware = (keyPrefix, keyFn, ttl = undefined) => {
  return async (req, res, next) => {
    try {
      // Generate cache key from request
      const keySuffix = keyFn ? keyFn(req) : `${req.originalUrl || req.url}`;
      const key = `${keyPrefix}:${keySuffix}`;
      
      // Check cache first
      const cachedData = exports.get(key);
      if (cachedData) {
        logger.debug(`Cache middleware hit: ${key}`);
        return res.json(cachedData);
      }
      
      // Replace res.json to intercept the response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache the response if successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
          exports.set(key, data, ttl);
          logger.debug(`Cache middleware saved: ${key}`);
        }
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error', { error });
      next(); // Continue without caching
    }
  };
};

// Aliases for common methods
exports.del = exports.delete;

// Export the underlying cache instance for advanced usage
exports._cache = cache;