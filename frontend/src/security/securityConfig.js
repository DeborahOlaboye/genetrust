// Security configuration for the application
export const securityConfig = {
  // Content Security Policy configuration
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'" // Required for some web3 libraries
    ],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: [
      "'self'",
      "https://*.infura.io",
      "https://*.alchemyapi.io"
    ],
    fontSrc: ["'self'", "data:"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: true
  },
  
  // Security headers configuration
  headers: {
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()'
    ].join(', ')
  }
};

/**
 * Generates a Content Security Policy header value
 * @returns {string} CSP header value
 */
export function generateCSP() {
  return Object.entries(securityConfig.csp)
    .map(([directive, values]) => {
      const value = Array.isArray(values) ? values.join(' ') : values;
      return `${directive} ${value}`;
    })
    .join('; ');
}

/**
 * Applies security headers to the response
 * @param {Object} res - Express response object
 */
export function applySecurityHeaders(res) {
  // Set CSP header
  res.setHeader('Content-Security-Policy', generateCSP());
  
  // Set other security headers
  Object.entries(securityConfig.headers).forEach(([header, value]) => {
    res.setHeader(`X-${header}`, value);
  });
  
  // Additional security headers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}
