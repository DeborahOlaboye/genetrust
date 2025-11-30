import logger from '../utils/logger.js';

/**
 * Middleware to log HTTP requests
 */
const requestLogger = (req, res, next) => {
  // Skip health check endpoints from logging
  if (req.path === '/health') {
    return next();
  }

  const start = Date.now();
  const { method, originalUrl, ip, body, query, params } = req;

  // Log request start
  logger.http(`Request: ${method} ${originalUrl}`, {
    ip,
    body: method !== 'GET' ? body : undefined,
    query,
    params,
  });

  // Log response when it's finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const contentLength = res.get('content-length') || 0;

    // Determine log level based on status code
    let logLevel = 'http';
    if (statusCode >= 500) {
      logLevel = 'error';
    } else if (statusCode >= 400) {
      logLevel = 'warn';
    }

    // Log the response
    logger[logLevel](
      `Response: ${method} ${originalUrl} ${statusCode} - ${duration}ms - ${contentLength}b`,
      {
        status: statusCode,
        duration: `${duration}ms`,
        contentLength: `${contentLength}b`,
      },
    );
  });

  next();
};

export default requestLogger;
