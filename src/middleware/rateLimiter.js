/**
 * Rate limiting middleware for Express.js
 * 
 * Protects API endpoints from abuse by limiting request frequency using a
 * sliding window algorithm with LRU cache for memory efficiency. Includes
 * comprehensive input validation, performance optimizations, and monitoring
 * capabilities.
 * 
 * @fileoverview Express.js rate limiting middleware with sliding window algorithm
 * @version 2.0.0
 * @since 1.0.0
 * @author GeneTrust Development Team
 * 
 * @example
 * // Basic rate limiting
 * import { RateLimiter } from './rateLimiter.js';
 * const limiter = new RateLimiter({ max: 100, windowMs: 15 * 60 * 1000 });
 * app.use(limiter.middleware());
 * 
 * @example
 * // Custom key generation
 * const limiter = new RateLimiter({
 *   keyGenerator: (req) => req.user?.id || req.ip,
 *   max: 50,
 *   windowMs: 60000
 * });
 */

import { LRUCache } from 'lru-cache';

/**
 * Rate limiter class using sliding window algorithm
 * 
 * Implements a memory-efficient rate limiting solution using a sliding window
 * approach with LRU cache for automatic cleanup. Provides configurable limits,
 * custom key generation, and comprehensive monitoring capabilities.
 * 
 * @class RateLimiter
 * @description Sliding window rate limiter with LRU cache
 * @version 2.0.0
 * @since 1.0.0
 * 
 * @example
 * // Create a rate limiter for API endpoints
 * const apiLimiter = new RateLimiter({
 *   windowMs: 15 * 60 * 1000, // 15 minutes
 *   max: 100, // 100 requests per window
 *   message: 'Too many API requests, please try again later'
 * });
 * 
 * @example
 * // Rate limiter for authentication endpoints
 * const authLimiter = new RateLimiter({
 *   windowMs: 15 * 60 * 1000,
 *   max: 5,
 *   skipSuccessfulRequests: true,
 *   message: 'Too many authentication attempts'
 * });
 */
export class RateLimiter {
    /**
     * Create a new rate limiter instance
     * 
     * Initializes a rate limiter with configurable options for time window,
     * request limits, and behavior. Uses sliding window algorithm with LRU cache
     * for efficient memory management and automatic cleanup.
     * 
     * @constructor
     * @param {Object} [options={}] - Configuration options
     * @param {number} [options.windowMs=900000] - Time window in milliseconds (15 minutes default, max 24 hours)
     * @param {number} [options.max=100] - Maximum requests per window (1-1,000,000)
     * @param {string} [options.message='Too many requests, please try again later'] - Error message when rate limited
     * @param {boolean} [options.skipSuccessfulRequests=false] - Don't count successful requests (2xx status codes)
     * @param {boolean} [options.skipFailedRequests=false] - Don't count failed requests (4xx/5xx status codes)
     * @param {Function} [options.keyGenerator] - Function to generate unique keys from requests
     * @param {boolean} [options.debug=false] - Enable debug logging for troubleshooting
     * @param {number} [options.cacheMax=10000] - Maximum cache entries for memory management
     * 
     * @param {Function} [options.keyGenerator] - Custom key generator function
     * @param {Object} request - Express request object
     * @param {string} request.ip - Client IP address
     * @param {string} [request.user.id] - User ID for user-based limiting
     * @returns {string} Unique key for rate limiting
     * 
     * @throws {Error} When windowMs is not a positive number or exceeds 24 hours
     * @throws {Error} When max is not a positive number or exceeds 1,000,000
     * @throws {Error} When message is not a non-empty string
     * @throws {Error} When boolean options are not boolean values
     * @throws {Error} When keyGenerator is not a function
     * @throws {Error} When cacheMax is not a positive number
     * 
     * @returns {RateLimiter} New RateLimiter instance
     * 
     * @example
     * // Create rate limiter with custom settings
     * const limiter = new RateLimiter({
     *   windowMs: 5 * 60 * 1000, // 5 minutes
     *   max: 50,
     *   message: 'Rate limit exceeded. Please try again in 5 minutes.',
     *   debug: process.env.NODE_ENV === 'development'
     * });
     * 
     * @example
     * // Rate limiter with custom key generation
     * const userLimiter = new RateLimiter({
     *   windowMs: 60 * 60 * 1000, // 1 hour
     *   max: 1000,
     *   keyGenerator: (req) => req.user?.id || req.ip,
     *   skipSuccessfulRequests: true
     * });
     */
    constructor(options = {}) {
        // Validate windowMs parameter
        if (options.windowMs !== undefined) {
            if (typeof options.windowMs !== 'number' || options.windowMs <= 0) {
                throw new Error('windowMs must be a positive number');
            }
            if (options.windowMs > 24 * 60 * 60 * 1000) {
                throw new Error('windowMs cannot exceed 24 hours');
            }
        }
        this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes

        // Validate max parameter
        if (options.max !== undefined) {
            if (typeof options.max !== 'number' || options.max <= 0) {
                throw new Error('max must be a positive number');
            }
            if (options.max > 1000000) {
                throw new Error('max cannot exceed 1,000,000 requests');
            }
        }
        this.max = options.max || 100;

        // Validate message parameter
        if (options.message !== undefined) {
            if (typeof options.message !== 'string' || options.message.length === 0) {
                throw new Error('message must be a non-empty string');
            }
        }
        this.message = options.message || 'Too many requests, please try again later';

        // Validate boolean parameters
        if (options.skipSuccessfulRequests !== undefined && typeof options.skipSuccessfulRequests !== 'boolean') {
            throw new Error('skipSuccessfulRequests must be a boolean');
        }
        this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;

        if (options.skipFailedRequests !== undefined && typeof options.skipFailedRequests !== 'boolean') {
            throw new Error('skipFailedRequests must be a boolean');
        }
        this.skipFailedRequests = options.skipFailedRequests || false;

        // Validate keyGenerator parameter
        if (options.keyGenerator !== undefined && typeof options.keyGenerator !== 'function') {
            throw new Error('keyGenerator must be a function');
        }
        this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;

        // Validate cache options
        const cacheMax = options.cacheMax || 10000;
        if (typeof cacheMax !== 'number' || cacheMax <= 0) {
            throw new Error('cacheMax must be a positive number');
        }

        // Validate debug option
        if (options.debug !== undefined && typeof options.debug !== 'boolean') {
            throw new Error('debug must be a boolean');
        }
        this.debug = options.debug || false;

        // Performance optimization: pre-allocate common arrays
        this._tempArray = [];
        this._lastCleanup = Date.now();
        this._cleanupInterval = Math.min(this.windowMs / 10, 60000); // Cleanup every 10% of window or 1 minute

        // Use LRU cache to store request counts with automatic cleanup
        this.cache = new LRUCache({
            max: cacheMax, // Maximum number of entries
            ttl: this.windowMs, // Time to live
            updateAgeOnGet: true,
            allowStale: false,
            // Performance optimization
            dispose: (value, key) => {
                // Clean up large arrays when entries are disposed
                if (value && value.requests && value.requests.length > 100) {
                    value.requests.length = 0;
                }
            }
        });
    }

    /**
     * Default key generator using IP address
     * @private
     * @param {Object} req - Express request object
     * @returns {string} Unique key for rate limiting
     * @throws {Error} If req is not an object
     */
    defaultKeyGenerator(req) {
        // Validate request object
        if (!req || typeof req !== 'object') {
            throw new Error('Request object must be provided');
        }

        // Try to get real IP behind proxies
        const ip = req.ip || 
                  req.connection?.remoteAddress || 
                  req.socket?.remoteAddress ||
                  (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
                  'unknown';
        
        // Sanitize IP to prevent injection
        const sanitizedIp = String(ip).replace(/[^a-fA-F0-9.:]/g, '').substring(0, 45);
        
        return sanitizedIp || 'unknown';
    }

    /**
     * Check if request should be counted
     * @private
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {boolean} Whether to count this request
     * @throws {Error} If req or res is not provided
     */
    shouldCountRequest(req, res) {
        // Validate parameters
        if (!req || typeof req !== 'object') {
            throw new Error('Request object must be provided');
        }
        if (!res || typeof res !== 'object') {
            throw new Error('Response object must be provided');
        }

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
     * @throws {Error} If key is not provided or invalid
     */
    getRequestCount(key) {
        // Validate key parameter
        if (!key) {
            throw new Error('Key must be provided');
        }
        if (typeof key !== 'string') {
            throw new Error('Key must be a string');
        }
        if (key.length === 0) {
            throw new Error('Key cannot be empty');
        }
        if (key.length > 255) {
            throw new Error('Key cannot exceed 255 characters');
        }

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

        // Validate entry structure
        if (!entry.requests || !Array.isArray(entry.requests)) {
            entry.requests = [];
        }

        // Filter out old requests (sliding window)
        entry.requests = entry.requests.filter(timestamp => {
            return typeof timestamp === 'number' && timestamp > windowStart;
        });
        entry.count = entry.requests.length;

        return entry;
    }

    /**
     * Update request count for a key
     * @private
     * @param {string} key - Unique identifier
     * @param {Object} entry - Request entry
     * @throws {Error} If parameters are invalid
     */
    updateRequestCount(key, entry) {
        // Validate key parameter
        if (!key || typeof key !== 'string' || key.length === 0) {
            throw new Error('Valid key must be provided');
        }

        // Validate entry parameter
        if (!entry || typeof entry !== 'object') {
            throw new Error('Entry must be an object');
        }
        if (!entry.requests || !Array.isArray(entry.requests)) {
            entry.requests = [];
        }

        const timestamp = Date.now();
        
        // Limit request history to prevent memory issues
        if (entry.requests.length >= this.max * 2) {
            // Keep only recent requests
            const cutoff = timestamp - this.windowMs;
            entry.requests = entry.requests.filter(t => t > cutoff);
        }

        entry.requests.push(timestamp);
        entry.count = entry.requests.length;
        
        // Validate count before caching
        if (entry.count < 0 || entry.count > this.max * 10) {
            throw new Error('Invalid request count detected');
        }

        this.cache.set(key, entry);
    }

    /**
     * Express middleware function
     * @returns {Function} Express middleware
     */
    middleware() {
        return (req, res, next) => {
            try {
                // Validate Express objects
                if (!req || typeof req !== 'object') {
                    return next(new Error('Invalid request object'));
                }
                if (!res || typeof res !== 'object') {
                    return next(new Error('Invalid response object'));
                }
                if (typeof next !== 'function') {
                    throw new Error('Next function must be provided');
                }

                const key = this.keyGenerator(req);
                const entry = this.getRequestCount(key);

                // Debug logging
                if (this.debug) {
                    console.debug(`RateLimiter[${key}]: ${entry.count}/${this.max} requests`);
                }

                // Add rate limit headers with validation
                try {
                    res.set({
                        'X-RateLimit-Limit': this.max,
                        'X-RateLimit-Remaining': Math.max(0, this.max - entry.count),
                        'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
                    });
                } catch (headerError) {
                    // Continue even if headers fail
                    console.warn('Failed to set rate limit headers:', headerError.message);
                }

                // Check if rate limit exceeded
                if (entry.count >= this.max) {
                    const retryAfter = Math.max(1, Math.ceil((entry.resetTime - Date.now()) / 1000));
                    
                    // Ensure response hasn't been sent yet
                    if (!res.headersSent) {
                        res.status(429).json({
                            error: 'Rate limit exceeded',
                            message: this.message,
                            retryAfter
                        });
                    }
                    return;
                }

                // Update count after response to check status
                res.on('finish', () => {
                    try {
                        if (this.shouldCountRequest(req, res)) {
                            this.updateRequestCount(key, entry);
                        }
                        // Perform periodic cleanup
                        this._performCleanup();
                    } catch (updateError) {
                        // Log error but don't crash
                        console.warn('Failed to update rate limit count:', updateError.message);
                    }
                });

                next();
            } catch (error) {
                // Pass errors to Express error handler
                next(error);
            }
        };
    }

    /**
     * Reset rate limit for a specific key
     * @param {string} key - Key to reset
     * @throws {Error} If key is not provided or invalid
     */
    reset(key) {
        // Validate key parameter
        if (!key) {
            throw new Error('Key must be provided');
        }
        if (typeof key !== 'string') {
            throw new Error('Key must be a string');
        }
        if (key.length === 0) {
            throw new Error('Key cannot be empty');
        }

        this.cache.delete(key);
    }

    /**
     * Get current stats for a key
     * @param {string} key - Key to check
     * @returns {Object|null} Rate limit stats
     * @throws {Error} If key is not provided or invalid
     */
    getStats(key) {
        // Validate key parameter
        if (!key) {
            throw new Error('Key must be provided');
        }
        if (typeof key !== 'string') {
            throw new Error('Key must be a string');
        }
        if (key.length === 0) {
            throw new Error('Key cannot be empty');
        }

        const entry = this.cache.get(key);
        if (!entry) return null;

        // Validate entry structure
        const count = typeof entry.count === 'number' ? entry.count : 0;
        const resetTime = typeof entry.resetTime === 'number' ? entry.resetTime : Date.now() + this.windowMs;

        return {
            count: Math.max(0, count),
            remaining: Math.max(0, this.max - count),
            resetTime,
            resetIn: Math.max(0, resetTime - Date.now())
        };
    }

    /**
     * Clear all rate limit entries
     */
    clear() {
        this.cache.clear();
        this._tempArray.length = 0;
        this._lastCleanup = Date.now();
    }

    /**
     * Perform periodic cleanup of expired entries
     * @private
     */
    _performCleanup() {
        const now = Date.now();
        
        // Only cleanup if enough time has passed
        if (now - this._lastCleanup < this._cleanupInterval) {
            return;
        }

        // Clean up temporary array
        if (this._tempArray.length > 1000) {
            this._tempArray.length = 0;
        }

        // Force cache cleanup
        if (typeof this.cache.purgeStale === 'function') {
            this.cache.purgeStale();
        }

        this._lastCleanup = now;
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache performance metrics
     */
    getCacheStats() {
        return {
            size: this.cache.size || 0,
            maxSize: this.cache.max || 0,
            itemCount: this.cache.itemCount || 0,
            hitRate: this.cache.calculatedSize ? 
                ((this.cache.calculatedSize - this.cache.size) / this.cache.calculatedSize * 100).toFixed(2) + '%' : 
                '0%',
            lastCleanup: this._lastCleanup,
            cleanupInterval: this._cleanupInterval
        };
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
