/**
 * Express.js error handling middleware
 * 
 * Provides comprehensive error handling for Express.js applications with
 * support for different error types, consistent error response formatting,
 * error logging, and customizable error handlers. Supports validation errors,
 * authentication errors, rate limit errors, and custom application errors.
 * 
 * @fileoverview Error handling middleware for Express.js
 * @version 1.0.0
 * @since 1.0.0
 * @author GeneTrust Development Team
 * 
 * @example
 * // Basic usage
 * import express from 'express';
 * import { errorHandler } from './middleware/errorHandler.js';
 * 
 * const app = express();
 * app.get('/api/data', async (req, res, next) => {
 *   try {
 *     // Your route logic
 *   } catch (error) {
 *     next(error); // Pass to error handler
 *   }
 * });
 * app.use(errorHandler);
 * 
 * @example
 * // Custom error types
 * class ValidationError extends AppError {
 *   constructor(message) {
 *     super(message, 400, 'VALIDATION_ERROR');
 *   }
 * }
 */

/**
 * Error severity levels for categorizing error importance
 * 
 * @readonly
 * @enum {string}
 */
export const ErrorSeverity = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

/**
 * Base application error class
 * 
 * Extends the native Error class with additional properties for
 * consistent error handling across the application. Includes status code,
 * error type, and additional context for debugging.
 * 
 * @class AppError
 * @description Base error class for application-specific errors
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @example
 * throw new AppError('Resource not found', 404, 'NOT_FOUND');
 */
export class AppError extends Error {
    /**
     * Creates a new application error
     * 
     * @constructor
     * @param {string} message - Error message
     * @param {number} [statusCode=500] - HTTP status code
     * @param {string} [errorType='INTERNAL_ERROR'] - Error type identifier
     * @param {Object} [details={}] - Additional error details
     * @param {string} [severity='medium'] - Error severity level
     * 
     * @example
     * const error = new AppError('User not found', 404, 'NOT_FOUND', {
     *   userId: '123',
     *   resource: 'User'
     * }, 'low');
     */
    constructor(message, statusCode = 500, errorType = 'INTERNAL_ERROR', details = {}, severity = 'medium') {
        super(message);
        
        /**
         * HTTP status code for the error
         * @type {number}
         */
        this.statusCode = statusCode;
        
        /**
         * Error type identifier
         * @type {string}
         */
        this.errorType = errorType;
        
        /**
         * Additional error details for debugging
         * @type {Object}
         */
        this.details = details;
        
        /**
         * Error timestamp
         * @type {number}
         */
        this.timestamp = Date.now();
        
        /**
         * Whether this error is operational (expected) or programming error
         * @type {boolean}
         */
        this.isOperational = true;
        
        /**
         * Error context for tracking request information
         * @type {Object}
         */
        this.context = {};
        
        /**
         * Error severity level
         * @type {string}
         */
        this.severity = severity;
        
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Add context to the error
     * 
     * @param {Object} context - Context information to add
     * @returns {AppError} This error instance for chaining
     * 
     * @example
     * error.addContext({ userId: '123', action: 'delete' });
     */
    addContext(context) {
        this.context = { ...this.context, ...context };
        return this;
    }

    /**
     * Convert error to JSON format
     * 
     * @returns {Object} Error object in JSON format
     */
    toJSON() {
        return {
            message: this.message,
            statusCode: this.statusCode,
            errorType: this.errorType,
            details: this.details,
            timestamp: this.timestamp,
            severity: this.severity,
            context: this.context,
            stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
        };
    }
}

/**
 * Validation error for request validation failures
 * 
 * @class ValidationError
 * @extends AppError
 * @description Error for request validation failures
 */
export class ValidationError extends AppError {
    /**
     * Creates a new validation error
     * 
     * @constructor
     * @param {string} message - Error message
     * @param {Object} [validationErrors={}] - Detailed validation errors
     * 
     * @example
     * throw new ValidationError('Invalid input', {
     *   email: 'Invalid email format',
     *   age: 'Must be a positive number'
     * });
     */
    constructor(message, validationErrors = {}) {
        super(message, 400, 'VALIDATION_ERROR', { validationErrors }, 'low');
    }
}

/**
 * Authentication error for failed authentication
 * 
 * @class AuthenticationError
 * @extends AppError
 * @description Error for authentication failures
 */
export class AuthenticationError extends AppError {
    /**
     * Creates a new authentication error
     * 
     * @constructor
     * @param {string} message - Error message
     * 
     * @example
     * throw new AuthenticationError('Invalid credentials');
     */
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR', {}, 'medium');
    }
}

/**
 * Authorization error for insufficient permissions
 * 
 * @class AuthorizationError
 * @extends AppError
 * @description Error for authorization failures
 */
export class AuthorizationError extends AppError {
    /**
     * Creates a new authorization error
     * 
     * @constructor
     * @param {string} message - Error message
     * @param {Object} [requiredPermissions={}] - Required permissions
     * 
     * @example
     * throw new AuthorizationError('Insufficient permissions', {
     *   required: ['read', 'write'],
     *   user: ['read']
     * });
     */
    constructor(message = 'Insufficient permissions', requiredPermissions = {}) {
        super(message, 403, 'AUTHORIZATION_ERROR', { requiredPermissions });
    }
}

/**
 * Not found error for missing resources
 * 
 * @class NotFoundError
 * @extends AppError
 * @description Error for missing resources
 */
export class NotFoundError extends AppError {
    /**
     * Creates a new not found error
     * 
     * @constructor
     * @param {string} message - Error message
     * @param {string} [resource] - Resource type that was not found
     * @param {string} [resourceId] - Resource identifier
     * 
     * @example
     * throw new NotFoundError('User not found', 'User', '123');
     */
    constructor(message = 'Resource not found', resource, resourceId) {
        super(message, 404, 'NOT_FOUND', { resource, resourceId });
    }
}

/**
 * Rate limit error for exceeding rate limits
 * 
 * @class RateLimitError
 * @extends AppError
 * @description Error for rate limit violations
 */
export class RateLimitError extends AppError {
    /**
     * Creates a new rate limit error
     * 
     * @constructor
     * @param {string} message - Error message
     * @param {Object} [rateLimitInfo={}] - Rate limit information
     * 
     * @example
     * throw new RateLimitError('Too many requests', {
     *   limit: 100,
     *   remaining: 0,
     *   resetAt: Date.now() + 60000
     * });
     */
    constructor(message = 'Rate limit exceeded', rateLimitInfo = {}) {
        super(message, 429, 'RATE_LIMIT_ERROR', { rateLimitInfo });
    }
}

/**
 * Conflict error for resource conflicts
 * 
 * @class ConflictError
 * @extends AppError
 * @description Error for resource conflicts
 */
export class ConflictError extends AppError {
    /**
     * Creates a new conflict error
     * 
     * @constructor
     * @param {string} message - Error message
     * @param {Object} [conflictDetails={}] - Conflict information
     * 
     * @example
     * throw new ConflictError('Resource already exists', {
     *   resource: 'User',
     *   field: 'email',
     *   value: 'test@example.com'
     * });
     */
    constructor(message = 'Resource conflict', conflictDetails = {}) {
        super(message, 409, 'CONFLICT_ERROR', { conflictDetails }, 'medium');
    }
}

/**
 * Database error for database-related failures
 * 
 * @class DatabaseError
 * @extends AppError
 * @description Error for database operations
 */
export class DatabaseError extends AppError {
    /**
     * Creates a new database error
     * 
     * @constructor
     * @param {string} message - Error message
     * @param {Object} [databaseDetails={}] - Database operation details
     * 
     * @example
     * throw new DatabaseError('Query failed', {
     *   query: 'SELECT * FROM users',
     *   error: 'Connection timeout'
     * });
     */
    constructor(message = 'Database operation failed', databaseDetails = {}) {
        super(message, 500, 'DATABASE_ERROR', { databaseDetails }, 'high');
    }
}

/**
 * Network error for network-related failures
 * 
 * @class NetworkError
 * @extends AppError
 * @description Error for network operations
 */
export class NetworkError extends AppError {
    /**
     * Creates a new network error
     * 
     * @constructor
     * @param {string} message - Error message
     * @param {Object} [networkDetails={}] - Network operation details
     * 
     * @example
     * throw new NetworkError('Request failed', {
     *   url: 'https://api.example.com',
     *   status: 503
     * });
     */
    constructor(message = 'Network request failed', networkDetails = {}) {
        super(message, 503, 'NETWORK_ERROR', { networkDetails }, 'medium');
    }
}

/**
 * Payment error for payment-related failures
 * 
 * @class PaymentError
 * @extends AppError
 * @description Error for payment operations
 */
export class PaymentError extends AppError {
    /**
     * Creates a new payment error
     * 
     * @constructor
     * @param {string} message - Error message
     * @param {Object} [paymentDetails={}] - Payment operation details
     * 
     * @example
     * throw new PaymentError('Payment failed', {
     *   transactionId: 'tx_123',
     *   reason: 'Insufficient funds'
     * });
     */
    constructor(message = 'Payment operation failed', paymentDetails = {}) {
        super(message, 402, 'PAYMENT_ERROR', { paymentDetails }, 'high');
    }
}

/**
 * Error handler middleware factory
 * 
 * Creates an Express error handling middleware with configurable options
 * for error logging, response formatting, and custom error handlers.
 * 
 * @function createErrorHandler
 * 
 * @param {Object} [options={}] - Configuration options
 * @param {boolean} [options.logErrors=true] - Enable error logging
 * @param {boolean} [options.includeStackTrace=false] - Include stack trace in response
 * @param {Object} [options.logger] - Custom logger instance
 * @param {Function} [options.customHandler] - Custom error handler function
 * @param {Object} [options.errorMappings] - Custom error type to status code mappings
 * @param {Function} [options.onError] - Callback function called on each error
 * @param {Function} [options.beforeResponse] - Callback called before sending error response
 * @param {Function} [options.afterResponse] - Callback called after sending error response
 * @param {Object} [options.translations] - Translation object for error messages
 * @param {string} [options.defaultLocale='en'] - Default locale for error messages
 * 
 * @returns {Function} Express error handling middleware
 * 
 * @example
 * const errorHandler = createErrorHandler({
 *   logErrors: true,
 *   includeStackTrace: process.env.NODE_ENV === 'development',
 *   errorMappings: {
 *     'CustomError': 418
 *   },
 *   translations: {
 *     en: { 'NOT_FOUND': 'Resource not found' },
 *     es: { 'NOT_FOUND': 'Recurso no encontrado' }
 *   }
 * });
 * app.use(errorHandler);
 */
export function createErrorHandler(options = {}) {
    const {
        logErrors = true,
        includeStackTrace = false,
        logger = console,
        customHandler = null,
        errorMappings = {},
        onError = null,
        beforeResponse = null,
        afterResponse = null,
        translations = {},
        defaultLocale = 'en'
    } = options;

    /**
     * Get localized error message
     * 
     * @param {string} message - Original error message
     * @param {string} errorType - Error type for translation lookup
     * @param {Object} req - Express request object
     * @returns {string} Localized or original error message
     */
    function getLocalizedMessage(message, errorType, req) {
        const locale = req.headers['accept-language']?.split(',')[0] || defaultLocale;
        
        if (translations[locale] && translations[locale][errorType]) {
            return translations[locale][errorType];
        }
        
        if (translations[defaultLocale] && translations[defaultLocale][errorType]) {
            return translations[defaultLocale][errorType];
        }
        
        return message;
    }

    /**
     * Express error handling middleware
     * 
     * @param {Error} err - Error object
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    return function errorHandler(err, req, res, next) {
        // Call onError callback if provided
        if (onError) {
            try {
                onError(err, req);
            } catch (callbackError) {
                logger.error('Error in onError callback:', callbackError);
            }
        }

        // Use custom handler if provided
        if (customHandler) {
            const handled = customHandler(err, req, res, next);
            if (handled) return;
        }

        // Determine status code and error type
        let statusCode = err.statusCode || 500;
        let errorType = err.errorType || 'INTERNAL_ERROR';

        // Check for custom error mappings
        if (err.constructor.name && errorMappings[err.constructor.name]) {
            statusCode = errorMappings[err.constructor.name];
        }

        // Log the error
        if (logErrors) {
            const logData = {
                error: err.message,
                errorType,
                statusCode,
                path: req.path,
                method: req.method,
                ip: req.ip,
                timestamp: new Date().toISOString()
            };

            if (statusCode >= 500) {
                logger.error('Server error:', logData);
            } else if (statusCode >= 400) {
                logger.warn('Client error:', logData);
            } else {
                logger.info('Error:', logData);
            }
        }

        // Get localized message if translations available
        const message = Object.keys(translations).length > 0
            ? getLocalizedMessage(err.message, errorType, req)
            : (err.message || 'An unexpected error occurred');

        // Prepare error response
        const errorResponse = {
            success: false,
            error: {
                message,
                type: errorType,
                statusCode,
                timestamp: Date.now(),
                path: req.path,
                method: req.method
            }
        };

        // Add stack trace in development or if explicitly enabled
        if (includeStackTrace || process.env.NODE_ENV === 'development') {
            errorResponse.error.stack = err.stack;
        }

        // Add error details if available
        if (err.details) {
            errorResponse.error.details = err.details;
        }

        // Add severity if available
        if (err.severity) {
            errorResponse.error.severity = err.severity;
        }

        // Add context if available
        if (err.context && Object.keys(err.context).length > 0) {
            errorResponse.error.context = err.context;
        }

        // Add request ID if available
        if (req.id) {
            errorResponse.error.requestId = req.id;
        }

        // Add locale if translations were used
        if (Object.keys(translations).length > 0) {
            const locale = req.headers['accept-language']?.split(',')[0] || defaultLocale;
            errorResponse.error.locale = locale;
        }

        // Call beforeResponse callback if provided
        if (beforeResponse) {
            try {
                beforeResponse(errorResponse, req, res);
            } catch (callbackError) {
                logger.error('Error in beforeResponse callback:', callbackError);
            }
        }

        // Send error response
        res.status(statusCode).json(errorResponse);

        // Call afterResponse callback if provided
        if (afterResponse) {
            try {
                afterResponse(errorResponse, req, res);
            } catch (callbackError) {
                logger.error('Error in afterResponse callback:', callbackError);
            }
        }
    };
}

/**
 * Default error handler middleware
 * 
 * Pre-configured error handler with sensible defaults for production use.
 * Logs errors and returns consistent error responses without stack traces.
 * 
 * @constant
 * @type {Function}
 * 
 * @example
 * app.use(errorHandler);
 */
export const errorHandler = createErrorHandler({
    logErrors: true,
    includeStackTrace: false
});

/**
 * Development error handler middleware
 * 
 * Pre-configured error handler for development with stack traces enabled
 * for easier debugging.
 * 
 * @constant
 * @type {Function}
 * 
 * @example
 * if (process.env.NODE_ENV === 'development') {
 *   app.use(devErrorHandler);
 * }
 */
export const devErrorHandler = createErrorHandler({
    logErrors: true,
    includeStackTrace: true
});

/**
 * Async error wrapper
 * 
 * Wraps async route handlers to catch errors and pass them to the
 * Express error handling middleware.
 * 
 * @function asyncHandler
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function with error handling
 * 
 * @example
 * app.get('/api/data', asyncHandler(async (req, res) => {
 *   const data = await fetchData();
 *   res.json(data);
 * }));
 */
export function asyncHandler(fn) {
    return function(req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * 404 Not Found handler
 * 
 * Handles requests to undefined routes with a consistent error response.
 * 
 * @function notFoundHandler
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @example
 * app.use(notFoundHandler);
 */
export function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: {
            message: `Route ${req.method} ${req.path} not found`,
            type: 'NOT_FOUND',
            statusCode: 404,
            timestamp: Date.now(),
            path: req.path,
            method: req.method
        }
    });
}
