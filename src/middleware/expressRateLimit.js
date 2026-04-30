/**
 * Express.js specific rate limiting middleware
 * Provides easy-to-use Express integration with route-specific limits
 */

import { createRateLimitMiddleware } from './rateLimitConfig.js';

/**
 * Rate limiting middleware factory for Express routes
 */
export class ExpressRateLimit {
    /**
     * Apply rate limiting to an Express app or router
     * @param {Object} app - Express app or router
     * @param {Object} options - Configuration options
     */
    static apply(app, options = {}) {
        const {
            enableGlobal = true,
            enablePerRoute = true,
            globalConfig = 'utility'
        } = options;

        // Apply global rate limiting if enabled
        if (enableGlobal) {
            app.use(createRateLimitMiddleware('utility', 'health-check'));
        }

        // Store original app.use for route detection
        const originalUse = app.use.bind(app);
        
        // Override app.use to add rate limiting based on route
        if (enablePerRoute) {
            app.use = function(path, ...middleware) {
                // Skip if path is not a string (error middleware, etc.)
                if (typeof path !== 'string') {
                    return originalUse(path, ...middleware);
                }

                // Determine rate limit category based on path
                const category = ExpressRateLimit.getCategoryFromPath(path);
                const endpoint = ExpressRateLimit.getEndpointFromPath(path);

                // Add rate limiting middleware if category found
                if (category && endpoint) {
                    const rateLimitMiddleware = createRateLimitMiddleware(category, endpoint);
                    return originalUse(path, rateLimitMiddleware, ...middleware);
                }

                // Apply default rate limiting for unknown routes
                const defaultMiddleware = createRateLimitMiddleware('utility', 'health-check');
                return originalUse(path, defaultMiddleware, ...middleware);
            };
        }
    }

    /**
     * Determine rate limit category from route path
     * @private
     * @param {string} path - Route path
     * @returns {string|null} Rate limit category
     */
    static getCategoryFromPath(path) {
        const pathSegments = path.toLowerCase().split('/').filter(Boolean);

        // Authentication routes
        if (pathSegments.includes('auth') || 
            pathSegments.includes('login') || 
            pathSegments.includes('register') ||
            pathSegments.includes('password')) {
            return 'auth';
        }

        // Sensitive data routes
        if (pathSegments.includes('genetic') || 
            pathSegments.includes('dataset') ||
            pathSegments.includes('data')) {
            return 'sensitive';
        }

        // Marketplace routes
        if (pathSegments.includes('marketplace') || 
            pathSegments.includes('listing') ||
            pathSegments.includes('trade') ||
            pathSegments.includes('purchase')) {
            return 'marketplace';
        }

        // Search routes
        if (pathSegments.includes('search') || 
            pathSegments.includes('browse') ||
            pathSegments.includes('explore')) {
            return 'search';
        }

        // Storage/IPFS routes
        if (pathSegments.includes('ipfs') || 
            pathSegments.includes('storage') ||
            pathSegments.includes('upload') ||
            pathSegments.includes('download')) {
            return 'storage';
        }

        // Blockchain routes
        if (pathSegments.includes('blockchain') || 
            pathSegments.includes('contract') ||
            pathSegments.includes('transaction') ||
            pathSegments.includes('balance')) {
            return 'blockchain';
        }

        // Utility routes (default)
        if (pathSegments.includes('health') || 
            pathSegments.includes('status') ||
            pathSegments.includes('version') ||
            pathSegments.includes('stats')) {
            return 'utility';
        }

        return null;
    }

    /**
     * Determine endpoint name from route path
     * @private
     * @param {string} path - Route path
     * @returns {string|null} Endpoint name
     */
    static getEndpointFromPath(path) {
        const pathSegments = path.toLowerCase().split('/').filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1];

        // Map path segments to endpoint names
        const endpointMap = {
            // Auth endpoints
            'login': 'login',
            'register': 'register',
            'password': 'password-reset',
            'verify': 'verify-email',
            
            // Sensitive endpoints
            'upload': 'dataset-upload',
            'download': 'dataset-download',
            'access': 'access-request',
            
            // Marketplace endpoints
            'create': 'create-listing',
            'buy': 'purchase-listing',
            'price': 'update-price',
            'cancel': 'cancel-listing',
            
            // Search endpoints
            'search': 'search-datasets',
            'browse': 'browse-listings',
            'metadata': 'get-metadata',
            
            // Utility endpoints
            'health': 'health-check',
            'stats': 'get-stats',
            'version': 'get-version',
            
            // Storage endpoints
            'ipfs': 'ipfs-upload',
            'pin': 'pin-data',
            
            // Blockchain endpoints
            'interact': 'contract-interact',
            'balance': 'get-balance',
            'transaction': 'get-transaction'
        };

        // Check for exact match
        if (endpointMap[lastSegment]) {
            return endpointMap[lastSegment];
        }

        // Check for partial matches
        for (const segment of pathSegments) {
            if (endpointMap[segment]) {
                return endpointMap[segment];
            }
        }

        // Default based on HTTP method patterns
        if (path.includes('POST')) return 'create-listing';
        if (path.includes('GET')) return 'get-metadata';
        if (path.includes('PUT')) return 'update-price';
        if (path.includes('DELETE')) return 'cancel-listing';

        return null;
    }

    /**
     * Create route-specific rate limiting middleware
     * @param {string} category - Rate limit category
     * @param {string} endpoint - Endpoint name
     * @returns {Function} Express middleware
     */
    static middleware(category, endpoint) {
        return createRateLimitMiddleware(category, endpoint);
    }

    /**
     * Apply rate limiting to specific HTTP methods
     * @param {Object} router - Express router
     * @param {string} path - Route path
     * @param {string} method - HTTP method
     * @param {Function} handler - Route handler
     */
    static applyToMethod(router, path, method, handler) {
        const category = this.getCategoryFromPath(path);
        const endpoint = this.getEndpointFromPath(path);

        if (category && endpoint) {
            const middleware = createRateLimitMiddleware(category, endpoint);
            router[method](path, middleware, handler);
        } else {
            router[method](path, handler);
        }
    }
}

/**
 * Decorator for applying rate limiting to Express route handlers
 * @param {string} category - Rate limit category
 * @param {string} endpoint - Endpoint name
 * @returns {Function} Decorator function
 */
export const rateLimit = (category, endpoint) => {
    return (target, propertyKey, descriptor) => {
        const originalMethod = descriptor.value;
        const middleware = createRateLimitMiddleware(category, endpoint);

        descriptor.value = function(req, res, next) {
            middleware(req, res, () => {
                return originalMethod.call(this, req, res, next);
            });
        };

        return descriptor;
    };
};

/**
 * Helper function to create rate-limited routes
 * @param {Object} router - Express router
 * @param {string} path - Route path
 * @param {string} category - Rate limit category
 * @param {string} endpoint - Endpoint name
 * @param {Function} handler - Route handler
 */
export const rateLimitedRoute = (router, path, category, endpoint, handler) => {
    const middleware = createRateLimitMiddleware(category, endpoint);
    router.use(path, middleware, handler);
};

export default ExpressRateLimit;
