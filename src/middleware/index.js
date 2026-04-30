/**
 * Middleware module exports
 * Centralizes all middleware for easy importing
 */

// Rate limiting middleware
export {
    RateLimiter,
    createRateLimiter,
    limiters,
    default as defaultRateLimiter
} from './rateLimiter.js';

export {
    rateLimitConfig,
    getRateLimiter,
    applyRateLimit,
    createRateLimitMiddleware,
    getAllRateLimits
} from './rateLimitConfig.js';

export {
    ExpressRateLimit,
    rateLimit,
    rateLimitedRoute,
    default as expressRateLimit
} from './expressRateLimit.js';

export {
    RateLimitMonitor,
    globalMonitor,
    rateLimitMonitor,
    getMonitoringData,
    default as rateLimitMonitorClass
} from './rateLimitMonitor.js';

// Other middleware
export { default as requestLogger } from './requestLogger.js';
