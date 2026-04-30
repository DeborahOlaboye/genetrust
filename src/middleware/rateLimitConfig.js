/**
 * Rate limiting configuration for different API endpoints
 * Centralizes rate limit settings for easy management
 */

import { limiters } from './rateLimiter.js';

/**
 * Rate limit configuration for different endpoint categories
 */
export const rateLimitConfig = {
    // Authentication endpoints - most restrictive
    auth: {
        login: {
            limiter: limiters.auth,
            description: 'Login attempts'
        },
        register: {
            limiter: limiters.auth,
            description: 'Registration attempts'
        },
        'password-reset': {
            limiter: limiters.auth,
            description: 'Password reset requests'
        },
        'verify-email': {
            limiter: limiters.auth,
            description: 'Email verification attempts'
        }
    },

    // Sensitive data operations
    sensitive: {
        'genetic-data': {
            limiter: limiters.strict,
            description: 'Genetic data operations'
        },
        'dataset-upload': {
            limiter: limiters.strict,
            description: 'Dataset uploads'
        },
        'dataset-download': {
            limiter: limiters.strict,
            description: 'Dataset downloads'
        },
        'access-request': {
            limiter: limiters.strict,
            description: 'Access requests'
        }
    },

    // Trading/marketplace endpoints
    marketplace: {
        'create-listing': {
            limiter: limiters.standard,
            description: 'Create marketplace listings'
        },
        'purchase-listing': {
            limiter: limiters.standard,
            description: 'Purchase marketplace items'
        },
        'update-price': {
            limiter: limiters.standard,
            description: 'Update listing prices'
        },
        'cancel-listing': {
            limiter: limiters.standard,
            description: 'Cancel listings'
        }
    },

    // Search and discovery endpoints
    search: {
        'search-datasets': {
            limiter: limiters.lenient,
            description: 'Dataset searches'
        },
        'browse-listings': {
            limiter: limiters.lenient,
            description: 'Browse marketplace'
        },
        'get-metadata': {
            limiter: limiters.lenient,
            description: 'Get dataset metadata'
        }
    },

    // Utility endpoints
    utility: {
        'health-check': {
            limiter: limiters.lenient,
            description: 'Health checks'
        },
        'get-stats': {
            limiter: limiters.standard,
            description: 'Get platform statistics'
        },
        'get-version': {
            limiter: limiters.lenient,
            description: 'Get version info'
        }
    },

    // IPFS operations
    storage: {
        'ipfs-upload': {
            limiter: limiters.strict,
            description: 'IPFS uploads'
        },
        'ipfs-download': {
            limiter: limiters.standard,
            description: 'IPFS downloads'
        },
        'pin-data': {
            limiter: limiters.standard,
            description: 'Pin data to IPFS'
        }
    },

    // Blockchain operations
    blockchain: {
        'contract-interact': {
            limiter: limiters.standard,
            description: 'Smart contract interactions'
        },
        'get-balance': {
            limiter: limiters.lenient,
            description: 'Get account balance'
        },
        'get-transaction': {
            limiter: limiters.lenient,
            description: 'Get transaction details'
        }
    }
};

/**
 * Get rate limiter for a specific endpoint
 * @param {string} category - Endpoint category
 * @param {string} endpoint - Specific endpoint name
 * @returns {Object|null} Rate limiter configuration
 */
export const getRateLimiter = (category, endpoint) => {
    const categoryConfig = rateLimitConfig[category];
    if (!categoryConfig) return null;

    const endpointConfig = categoryConfig[endpoint];
    if (!endpointConfig) return null;

    return endpointConfig;
};

/**
 * Apply rate limiting to an Express router based on path
 * @param {Object} router - Express router
 * @param {string} category - Endpoint category
 * @param {string} endpoint - Endpoint name
 */
export const applyRateLimit = (router, category, endpoint) => {
    const config = getRateLimiter(category, endpoint);
    if (config) {
        router.use(config.limiter.middleware());
    }
};

/**
 * Middleware factory for dynamic rate limiting
 * @param {string} category - Endpoint category
 * @param {string} endpoint - Endpoint name
 * @returns {Function} Express middleware
 */
export const createRateLimitMiddleware = (category, endpoint) => {
    const config = getRateLimiter(category, endpoint);
    if (!config) {
        // Return no-op middleware if no configuration found
        return (req, res, next) => next();
    }

    return config.limiter.middleware();
};

/**
 * Get all rate limit configurations for monitoring
 * @returns {Array} Array of rate limit configurations
 */
export const getAllRateLimits = () => {
    const configs = [];

    Object.entries(rateLimitConfig).forEach(([category, endpoints]) => {
        Object.entries(endpoints).forEach(([endpoint, config]) => {
            configs.push({
                category,
                endpoint,
                description: config.description,
                windowMs: config.limiter.windowMs,
                max: config.limiter.max
            });
        });
    });

    return configs;
};

export default rateLimitConfig;
