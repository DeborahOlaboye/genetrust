/**
 * Type definitions and interfaces for rate limiting middleware
 * Provides TypeScript-like type safety for JavaScript code
 */

/**
 * @typedef {Object} RateLimiterOptions
 * @property {number} [windowMs=900000] - Time window in milliseconds (15 minutes default)
 * @property {number} [max=100] - Maximum requests per window
 * @property {string} [message] - Error message when rate limited
 * @property {boolean} [skipSuccessfulRequests=false] - Don't count successful requests
 * @property {boolean} [skipFailedRequests=false] - Don't count failed requests
 * @property {Function} [keyGenerator] - Function to generate unique keys
 * @property {number} [cacheMax=10000] - Maximum cache entries
 */

/**
 * @typedef {Object} RateLimitEntry
 * @property {number} count - Current request count
 * @property {number} resetTime - When the window resets
 * @property {number[]} requests - Array of request timestamps
 */

/**
 * @typedef {Object} RateLimitStats
 * @property {number} count - Current request count
 * @property {number} remaining - Remaining requests
 * @property {number} resetTime - Reset timestamp
 * @property {number} resetIn - Milliseconds until reset
 */

/**
 * @typedef {Object} RateLimitHeaders
 * @property {number} X-RateLimit-Limit - Maximum requests per window
 * @property {number} X-RateLimit-Remaining - Remaining requests
 * @property {string} X-RateLimit-Reset - Reset time ISO string
 */

/**
 * @typedef {Object} RateLimitResponse
 * @property {string} error - Error type
 * @property {string} message - Error message
 * @property {number} retryAfter - Seconds to wait
 */

/**
 * @typedef {Object} RateLimitConfig
 * @property {import('./rateLimiter.js').RateLimiter} limiter - Rate limiter instance
 * @property {string} description - Configuration description
 */

/**
 * @typedef {Object} MonitoringMetrics
 * @property {string} category - Endpoint category
 * @property {string} endpoint - Endpoint name
 * @property {string} description - Endpoint description
 * @property {number} windowMs - Time window
 * @property {number} max - Maximum requests
 * @property {number} totalRequests - Total requests
 * @property {number} blockedRequests - Blocked requests
 * @property {number} allowedRequests - Allowed requests
 * @property {number} averageRequestsPerWindow - Average requests
 * @property {number} peakRequestsPerWindow - Peak requests
 * @property {number} lastReset - Last reset time
 * @property {Array<Object>} windows - Time window data
 */

/**
 * @typedef {Object} MonitoringSummary
 * @property {number} totalEndpoints - Total number of endpoints
 * @property {number} totalRequests - Total requests across all endpoints
 * @property {number} totalBlocked - Total blocked requests
 * @property {number} totalAllowed - Total allowed requests
 * @property {string} overallBlockRate - Overall block rate percentage
 * @property {number} uptime - Monitor uptime in milliseconds
 * @property {Object|null} mostActiveEndpoint - Most active endpoint
 * @property {Object|null} mostBlockedEndpoint - Most blocked endpoint
 */

/**
 * Validates rate limiter options
 * @param {RateLimiterOptions} options - Options to validate
 * @throws {Error} If options are invalid
 */
export const validateRateLimiterOptions = (options) => {
    if (!options || typeof options !== 'object') {
        return; // Empty options are valid
    }

    if (options.windowMs !== undefined) {
        if (typeof options.windowMs !== 'number' || options.windowMs <= 0) {
            throw new Error('windowMs must be a positive number');
        }
        if (options.windowMs > 24 * 60 * 60 * 1000) {
            throw new Error('windowMs cannot exceed 24 hours');
        }
    }

    if (options.max !== undefined) {
        if (typeof options.max !== 'number' || options.max <= 0) {
            throw new Error('max must be a positive number');
        }
        if (options.max > 1000000) {
            throw new Error('max cannot exceed 1,000,000 requests');
        }
    }

    if (options.message !== undefined) {
        if (typeof options.message !== 'string' || options.message.length === 0) {
            throw new Error('message must be a non-empty string');
        }
    }

    if (options.skipSuccessfulRequests !== undefined && 
        typeof options.skipSuccessfulRequests !== 'boolean') {
        throw new Error('skipSuccessfulRequests must be a boolean');
    }

    if (options.skipFailedRequests !== undefined && 
        typeof options.skipFailedRequests !== 'boolean') {
        throw new Error('skipFailedRequests must be a boolean');
    }

    if (options.keyGenerator !== undefined && typeof options.keyGenerator !== 'function') {
        throw new Error('keyGenerator must be a function');
    }

    if (options.cacheMax !== undefined) {
        if (typeof options.cacheMax !== 'number' || options.cacheMax <= 0) {
            throw new Error('cacheMax must be a positive number');
        }
    }
};

/**
 * Validates Express request object
 * @param {Object} req - Express request object
 * @throws {Error} If request is invalid
 */
export const validateExpressRequest = (req) => {
    if (!req || typeof req !== 'object') {
        throw new Error('Request object must be provided');
    }
};

/**
 * Validates Express response object
 * @param {Object} res - Express response object
 * @throws {Error} If response is invalid
 */
export const validateExpressResponse = (res) => {
    if (!res || typeof res !== 'object') {
        throw new Error('Response object must be provided');
    }
    if (typeof res.status !== 'function') {
        throw new Error('Response must have a status method');
    }
    if (typeof res.set !== 'function') {
        throw new Error('Response must have a set method');
    }
};

/**
 * Validates rate limit key
 * @param {string} key - Rate limit key
 * @throws {Error} If key is invalid
 */
export const validateRateLimitKey = (key) => {
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
};

/**
 * Validates rate limit entry
 * @param {RateLimitEntry} entry - Rate limit entry
 * @throws {Error} If entry is invalid
 */
export const validateRateLimitEntry = (entry) => {
    if (!entry || typeof entry !== 'object') {
        throw new Error('Entry must be an object');
    }
    if (!entry.requests || !Array.isArray(entry.requests)) {
        throw new Error('Entry must have a requests array');
    }
    if (typeof entry.count !== 'number') {
        throw new Error('Entry must have a numeric count');
    }
    if (typeof entry.resetTime !== 'number') {
        throw new Error('Entry must have a numeric resetTime');
    }
};

/**
 * Default rate limiter configuration
 * @type {RateLimiterOptions}
 */
export const defaultRateLimiterOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests, please try again later',
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    cacheMax: 10000
};

/**
 * Rate limit categories
 * @readonly
 * @enum {string}
 */
export const RateLimitCategories = {
    AUTH: 'auth',
    SENSITIVE: 'sensitive',
    MARKETPLACE: 'marketplace',
    SEARCH: 'search',
    UTILITY: 'utility',
    STORAGE: 'storage',
    BLOCKCHAIN: 'blockchain'
};

/**
 * Rate limit presets
 * @readonly
 * @enum {Object}
 */
export const RateLimitPresets = {
    STRICT: {
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: 'Rate limit exceeded for sensitive endpoint'
    },
    STANDARD: {
        windowMs: 15 * 60 * 1000,
        max: 100
    },
    LENIENT: {
        windowMs: 15 * 60 * 1000,
        max: 1000
    },
    AUTH: {
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: 'Too many authentication attempts, please try again later'
    }
};

export default {
    validateRateLimiterOptions,
    validateExpressRequest,
    validateExpressResponse,
    validateRateLimitKey,
    validateRateLimitEntry,
    defaultRateLimiterOptions,
    RateLimitCategories,
    RateLimitPresets
};
