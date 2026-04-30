/**
 * Rate limiting middleware for Express.js
 * Protects API endpoints from abuse by limiting request frequency
 */

import { LRUCache } from 'lru-cache';

/**
 * Rate limiter class using sliding window algorithm
 */
export class RateLimiter {
    /**
     * Create a new rate limiter
     * @param {Object} options - Configuration options
     * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
     * @param {number} options.max - Maximum requests per window (default: 100)
     * @param {string} options.message - Error message when rate limited
     * @param {boolean} options.skipSuccessfulRequests - Don't count successful requests
     * @param {boolean} options.skipFailedRequests - Don't count failed requests
     * @param {Function} options.keyGenerator - Function to generate unique keys
     */
    constructor(options = {}) {
        this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
        this.max = options.max || 100;
        this.message = options.message || 'Too many requests, please try again later';
        this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
        this.skipFailedRequests = options.skipFailedRequests || false;
        this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;

        // Use LRU cache to store request counts with automatic cleanup
        this.cache = new LRUCache({
            max: 10000, // Maximum number of entries
            ttl: this.windowMs, // Time to live
            updateAgeOnGet: true,
            allowStale: false
        });
    }

    /**
     * Default key generator using IP address
     * @private
     * @param {Object} req - Express request object
     * @returns {string} Unique key for rate limiting
     */
    defaultKeyGenerator(req) {
        // Try to get real IP behind proxies
        const ip = req.ip || 
                  req.connection?.remoteAddress || 
                  req.socket?.remoteAddress ||
                  (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
                  'unknown';
        return ip;
    }

    /**
     * Check if request should be counted
     * @private
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {boolean} Whether to count this request
     */
    shouldCountRequest(req, res) {
        // Skip successful requests if configured
        if (this.skipSuccessfulRequests && res.statusCode >= 200 && res.statusCode < 300) {
            return false;
        }

        // Skip failed requests if configured
        if (this.skipFailedRequests && (res.statusCode >= 400 || res.statusCode < 200)) {
            return false;
        }

        return true;
    }

    /**
     * Get current request count for a key
     * @private
     * @param {string} key - Unique identifier
     * @returns {Object} Request count info
     */
    getRequestCount(key) {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        let entry = this.cache.get(key);
        
        if (!entry) {
            entry = {
                count: 0,
                resetTime: now + this.windowMs,
                requests: []
            };
        }

        // Filter out old requests (sliding window)
        entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);
        entry.count = entry.requests.length;

        return entry;
    }

    /**
     * Update request count for a key
     * @private
     * @param {string} key - Unique identifier
     * @param {Object} entry - Request entry
     */
    updateRequestCount(key, entry) {
        entry.requests.push(Date.now());
        entry.count = entry.requests.length;
        this.cache.set(key, entry);
    }

    /**
     * Express middleware function
     * @returns {Function} Express middleware
     */
    middleware() {
        return (req, res, next) => {
            const key = this.keyGenerator(req);
            const entry = this.getRequestCount(key);

            // Add rate limit headers
            res.set({
                'X-RateLimit-Limit': this.max,
                'X-RateLimit-Remaining': Math.max(0, this.max - entry.count),
                'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
            });

            // Check if rate limit exceeded
            if (entry.count >= this.max) {
                res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: this.message,
                    retryAfter: Math.ceil((entry.resetTime - Date.now()) / 1000)
                });
                return;
            }

            // Update count after response to check status
            res.on('finish', () => {
                if (this.shouldCountRequest(req, res)) {
                    this.updateRequestCount(key, entry);
                }
            });

            next();
        };
    }

    /**
     * Reset rate limit for a specific key
     * @param {string} key - Key to reset
     */
    reset(key) {
        this.cache.delete(key);
    }

    /**
     * Get current stats for a key
     * @param {string} key - Key to check
     * @returns {Object|null} Rate limit stats
     */
    getStats(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        return {
            count: entry.count,
            remaining: Math.max(0, this.max - entry.count),
            resetTime: entry.resetTime,
            resetIn: Math.max(0, entry.resetTime - Date.now())
        };
    }

    /**
     * Clear all rate limit entries
     */
    clear() {
        this.cache.clear();
    }
}

/**
 * Create a rate limiter with default settings
 * @param {Object} options - Configuration options
 * @returns {RateLimiter} New rate limiter instance
 */
export const createRateLimiter = (options = {}) => {
    return new RateLimiter(options);
};

/**
 * Pre-configured rate limiters for common use cases
 */
export const limiters = {
    // Strict rate limiter for sensitive endpoints
    strict: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10,
        message: 'Rate limit exceeded for sensitive endpoint'
    }),

    // Standard rate limiter for general API
    standard: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100
    }),

    // Lenient rate limiter for public endpoints
    lenient: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000
    }),

    // Auth-specific rate limiter (more restrictive)
    auth: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5,
        message: 'Too many authentication attempts, please try again later'
    })
};

// Export default rate limiter
export default limiters.standard;
