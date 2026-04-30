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

export {
    RateLimitHealth,
    HealthStatus,
    createHealthCheckMiddleware,
    defaultHealthChecker,
    default as rateLimitHealth
} from './rateLimitHealth.js';

export {
    validateRateLimiterOptions,
    validateExpressRequest,
    validateExpressResponse,
    validateRateLimitKey,
    validateRateLimitEntry,
    defaultRateLimiterOptions,
    RateLimitCategories,
    RateLimitPresets
} from './rateLimiterTypes.js';

export {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ConflictError,
    DatabaseError,
    NetworkError,
    PaymentError,
    ErrorSeverity,
    createErrorHandler,
    errorHandler,
    devErrorHandler,
    asyncHandler,
    notFoundHandler,
    aggregateErrors
} from './errorHandler.js';

// Other middleware
export { default as requestLogger } from './requestLogger.js';
