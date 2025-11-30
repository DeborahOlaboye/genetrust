/**
 * Sanitizes sensitive data in objects before logging
 * @param {Object} obj - The object to sanitize
 * @returns {Object} Sanitized object with sensitive data masked
 */
const sanitize = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sensitiveFields = [
    'password',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'privateKey',
    'private_key',
    'accessToken',
    'refreshToken',
    'authorization',
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
 * Middleware to sanitize logs by redacting sensitive information
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
