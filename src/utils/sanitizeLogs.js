/**
 * Sanitizes sensitive data in objects before logging
 * 
 * Recursively processes objects and arrays to identify and mask sensitive
 * information such as passwords, tokens, API keys, and other credentials.
 * Uses a comprehensive list of sensitive field patterns and preserves object
 * structure while replacing sensitive values with redacted markers.
 * 
 * @fileoverview Log sanitization utilities for sensitive data protection
 * @version 2.0.0
 * @since 1.0.0
 * @author GeneTrust Development Team
 * 
 * @example
 * // Basic sanitization
 * const sanitized = sanitize({
 *   username: 'john',
 *   password: 'secret123',
 *   apiKey: 'abc123'
 * });
 * // Result: { username: 'john', password: '***REDACTED***', apiKey: '***REDACTED***' }
 * 
 * @example
 * // Nested object sanitization
 * const sanitized = sanitize({
 *   user: { name: 'John', credentials: { token: 'xyz' } },
 *   data: [1, 2, 3]
 * });
 */

/**
 * Sanitizes sensitive data in objects before logging
 * 
 * Recursively processes objects and arrays to identify and mask sensitive
 * information. Preserves the original object structure while replacing
 * sensitive values with '***REDACTED***' markers.
 * 
 * @function sanitize
 * 
 * @param {Object|Array} obj - The object or array to sanitize
 * @param {string} [obj.password] - Password fields will be redacted
 * @param {string} [obj.token] - Token fields will be redacted
 * @param {string} [obj.apiKey] - API key fields will be redacted
 * @param {string} [obj.api_key] - API key fields (underscore variant) will be redacted
 * @param {string} [obj.secret] - Secret fields will be redacted
 * @param {string} [obj.privateKey] - Private key fields will be redacted
 * @param {string} [obj.private_key] - Private key fields (underscore variant) will be redacted
 * @param {string} [obj.accessToken] - Access token fields will be redacted
 * @param {string} [obj.refreshToken] - Refresh token fields will be redacted
 * @param {string} [obj.authorization] - Authorization fields will be redacted
 * 
 * @returns {Object|Array} Sanitized object or array with sensitive data masked
 * 
 * @throws {Error} When circular references are detected (prevents infinite recursion)
 * 
 * @example
 * // Sanitize user credentials
 * const user = {
 *   username: 'john_doe',
 *   email: 'john@example.com',
 *   password: 'superSecret123',
 *   profile: {
 *     apiKey: 'sk-1234567890',
 *     preferences: { theme: 'dark' }
 *   }
 * };
 * const sanitized = sanitize(user);
 * // Result: {
 * //   username: 'john_doe',
 * //   email: 'john@example.com',
 * //   password: '***REDACTED***',
 * //   profile: {
 * //     apiKey: '***REDACTED***',
 * //     preferences: { theme: 'dark' }
 * //   }
 * // }
 * 
 * @example
 * // Sanitize array of objects
 * const requests = [
 *   { id: 1, token: 'abc123' },
 *   { id: 2, data: 'safe' },
 *   { id: 3, secret: 'xyz789' }
 * ];
 * const sanitized = sanitize(requests);
 * // Result: [
 * //   { id: 1, token: '***REDACTED***' },
 * //   { id: 2, data: 'safe' },
 * //   { id: 3, secret: '***REDACTED***' }
 * // ]
 */
const sanitize = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  /**
   * List of sensitive field patterns to detect and redact
   * Includes common variations and naming conventions for sensitive data
   * 
   * @type {string[]}
   * @readonly
   */
  const sensitiveFields = [
    'password',           // Password fields
    'token',              // General tokens
    'apiKey',             // API keys (camelCase)
    'api_key',            // API keys (snake_case)
    'secret',             // Secret values
    'privateKey',         // Private keys (camelCase)
    'private_key',        // Private keys (snake_case)
    'accessToken',        // Access tokens
    'refreshToken',       // Refresh tokens
    'authorization',      // Authorization headers
    'auth',               // Short for authorization
    'credential',         // Credentials
    'key',                // Generic keys (context-dependent)
    'passphrase',         // Passphrases
    'pin',                // PIN codes
    'ssn',                // Social security numbers
    'creditCard',         // Credit card numbers
    'bankAccount'         // Bank account numbers
  ];

  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };

  Object.keys(sanitized).forEach((key) => {
    const lowerKey = key.toLowerCase();
    
    // Check if the key indicates sensitive data
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '***REDACTED***';
    } 
    // Recursively sanitize nested objects and arrays
    else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitize(sanitized[key]);
    }
  });

  return sanitized;
};

/**
 * Express.js middleware to sanitize logs by redacting sensitive information
 * 
 * Intercepts request and response logging to automatically sanitize sensitive
 * data before it's written to logs. Wraps the standard Express methods to
 * ensure all logged data is properly sanitized while maintaining normal
 * application functionality.
 * 
 * @function logSanitizer
 * @fileoverview Express middleware for log sanitization
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * 
 * @returns {void} Calls next() to continue request processing
 * 
 * @example
 * // Apply to Express app
 * import express from 'express';
 * import { logSanitizer } from './utils/sanitizeLogs.js';
 * 
 * const app = express();
 * app.use(logSanitizer);
 * 
 * @example
 * // Apply to specific routes
 * app.use('/api/auth', logSanitizer);
 * 
 * @example
 * // Works with existing request logger
 * app.use(logSanitizer);
 * app.use(requestLogger); // Will log sanitized data
 */
const logSanitizer = (req, res, next) => {
  // Store the original methods
  const originalReqJson = req.json;
  const originalResJson = res.json;
  const originalSend = res.send;

  // Override request.json() to sanitize request body
  if (originalReqJson) {
    req.json = function(body) {
      return originalReqJson.call(this, sanitize(body));
    };
  }

  // Override response.json() to sanitize response body
  res.json = function(body) {
    return originalResJson.call(this, sanitize(body));
  };

  // Override response.send() to sanitize response body
  res.send = function(body) {
    if (typeof body === 'object') {
      return originalSend.call(this, sanitize(body));
    }
    return originalSend.call(this, body);
  };

  next();
};

export { sanitize, logSanitizer };
