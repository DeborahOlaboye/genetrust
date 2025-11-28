import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * useBlockchainCache Hook
 *
 * Caching layer for blockchain queries with TTL and invalidation
 *
 * Features:
 * - In-memory caching with TTL (time-to-live)
 * - Cache invalidation
 * - Automatic cache cleanup
 * - Cache statistics
 */

const DEFAULT_TTL = 60000; // 1 minute
const CLEANUP_INTERVAL = 300000; // 5 minutes

class BlockchainCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
    };
  }

  /**
   * Generate cache key from query parameters
   */
  generateKey(method, params = []) {
    return `${method}:${JSON.stringify(params)}`;
  }

  /**
   * Get cached value
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set cached value with TTL
   */
  set(key, data, ttl = DEFAULT_TTL) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    });
    this.stats.sets++;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key) {
    return this.cache.delete(key);
  }

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0 };
  }

  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;

    return {
      ...this.stats,
      hitRate: hitRate.toFixed(2),
      size: this.cache.size,
    };
  }
}

// Singleton cache instance
const blockchainCache = new BlockchainCache();

export const useBlockchainCache = (options = {}) => {
  const { ttl = DEFAULT_TTL, enableStats = false } = options;
  const [stats, setStats] = useState(null);
  const cleanupIntervalRef = useRef(null);

  // Setup automatic cleanup
  useEffect(() => {
    cleanupIntervalRef.current = setInterval(() => {
      blockchainCache.cleanup();
      if (enableStats) {
        setStats(blockchainCache.getStats());
      }
    }, CLEANUP_INTERVAL);

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [enableStats]);

  /**
   * Execute query with caching
   */
  const cachedQuery = useCallback(async (method, queryFn, params = [], options = {}) => {
    const { ttl: queryTtl = ttl, forceRefresh = false } = options;
    const key = blockchainCache.generateKey(method, params);

    // Check cache first
    if (!forceRefresh) {
      const cached = blockchainCache.get(key);
      if (cached !== null) {
        return cached;
      }
    }

    // Execute query
    try {
      const result = await queryFn(...params);
      blockchainCache.set(key, result, queryTtl);
      return result;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  }, [ttl]);

  /**
   * Invalidate specific cache
   */
  const invalidate = useCallback((method, params = []) => {
    const key = blockchainCache.generateKey(method, params);
    return blockchainCache.invalidate(key);
  }, []);

  /**
   * Invalidate by pattern
   */
  const invalidatePattern = useCallback((pattern) => {
    return blockchainCache.invalidatePattern(pattern);
  }, []);

  /**
   * Clear all cache
   */
  const clearCache = useCallback(() => {
    blockchainCache.clear();
  }, []);

  /**
   * Get current statistics
   */
  const getStats = useCallback(() => {
    return blockchainCache.getStats();
  }, []);

  return {
    cachedQuery,
    invalidate,
    invalidatePattern,
    clearCache,
    getStats,
    stats,
  };
};

export default useBlockchainCache;
