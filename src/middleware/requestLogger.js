/**
 * Express.js middleware for comprehensive HTTP request logging
 * 
 * Provides detailed logging of HTTP requests and responses including timing,
 * status codes, content length, and contextual information. Automatically
 * adjusts log levels based on response status codes and skips health check
 * endpoints to reduce noise in logs.
 * 
 * @fileoverview HTTP request logging middleware for Express.js
 * @version 2.0.0
 * @since 1.0.0
 * @author GeneTrust Development Team
 * 
 * @example
 * // Basic usage
 * import express from 'express';
 * import { requestLogger } from './middleware/requestLogger.js';
 * 
 * const app = express();
 * app.use(requestLogger);
 * 
 * @example
 * // Use with specific routes
 * app.use('/api', requestLogger);
 * 
 * @example
 * // Custom health check endpoint (will be skipped)
 * app.get('/health', (req, res) => res.json({ status: 'ok' }));
 */

import logger from '../utils/logger.js';

/**
 * Express middleware function for logging HTTP requests and responses
 * 
 * Logs incoming requests with method, URL, IP, and relevant data,
 * then logs the response with status code, duration, and content length.
 * Uses different log levels based on response status codes for better
 * monitoring and debugging.
 * 
 * @function requestLogger
 * @param {Object} req - Express request object
 * @param {string} req.method - HTTP method (GET, POST, etc.)
 * @param {string} req.originalUrl - Original request URL
 * @param {string} req.path - Request path (used for health check filtering)
 * @param {string} req.ip - Client IP address
 * @param {Object} [req.body] - Request body (logged for non-GET requests)
 * @param {Object} [req.query] - Query parameters
 * @param {Object} [req.params] - Route parameters
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * 
 * @returns {void} Calls next() to continue request processing
 * 
 * @example
 * // Apply to all routes
 * app.use(requestLogger);
 * 
 * @example
 * // Apply to specific route patterns
 * app.use('/api/v1/*', requestLogger);
 * 
 * @example
 * // Skip logging for health checks (automatic)
 * // Health check endpoints at /health and /health/* are automatically skipped
 */
const requestLogger = (req, res, next) => {
  // Skip health check endpoints from logging to reduce noise
  // Health checks are frequent and don't need detailed logging
  if (req.path === '/health' || req.path.startsWith('/health/')) {
    return next();
  }

  const start = Date.now();
  const { method, originalUrl, ip, body, query, params } = req;

  // Log incoming request with contextual information
  // Include body for non-GET requests to help with debugging
  logger.http(`Request: ${method} ${originalUrl}`, {
    ip,
    userAgent: req.get('User-Agent'),
    body: method !== 'GET' ? body : undefined,
    query,
    params,
  });

  // Log response when it's finished to capture complete request lifecycle
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const contentLength = res.get('content-length') || 0;

    // Determine appropriate log level based on response status
    // Error responses (5xx) get 'error' level for immediate attention
    // Client errors (4xx) get 'warn' level for monitoring
    // Success responses get 'http' level for normal operation logging
    let logLevel = 'http';
    if (statusCode >= 500) {
      logLevel = 'error';
    } else if (statusCode >= 400) {
      logLevel = 'warn';
    }

    // Log comprehensive response information
    logger[logLevel](
      `Response: ${method} ${originalUrl} ${statusCode} - ${duration}ms - ${contentLength}b`,
      {
        status: statusCode,
        duration: `${duration}ms`,
        contentLength: `${contentLength}b`,
        // Add performance categorization
        performance: duration > 1000 ? 'slow' : duration > 500 ? 'moderate' : 'fast',
        // Add response size categorization
        sizeCategory: contentLength > 1000000 ? 'large' : contentLength > 10000 ? 'medium' : 'small'
      },
    );
  });

  next();
};

export default requestLogger;
