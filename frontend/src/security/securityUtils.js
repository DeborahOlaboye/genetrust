import { securityConfig } from './securityConfig';

/**
 * Sanitizes input to prevent XSS attacks
 * @param {string} str - The string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeInput(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Validates URL to prevent open redirects
 * @param {string} url - The URL to validate
 * @returns {boolean} True if URL is safe
 */
export function isValidUrl(url) {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    // Only allow same-origin URLs or trusted domains
    const allowedDomains = [
      window.location.hostname,
      'trusted-domain.com', // Add your trusted domains here
    ];
    
    return allowedDomains.some(domain => 
      parsedUrl.hostname === domain || 
      parsedUrl.hostname.endsWith(`.${domain}`)
    );
  } catch (e) {
    return false;
  }
}

/**
 * Sets security-related meta tags in the document head
 */
export function setSecurityMetaTags() {
  // Set CSP meta tag (for older browsers that don't support headers)
  const cspMeta = document.createElement('meta');
  cspMeta.httpEquiv = 'Content-Security-Policy';
  cspMeta.content = Object.entries(securityConfig.csp)
    .map(([key, value]) => {
      const val = Array.isArray(value) ? value.join(' ') : value;
      return `${key} ${val}`;
    })
    .join('; ');
  
  document.head.appendChild(cspMeta);
  
  // Set other security-related meta tags
  const securityMetaTags = [
    { name: 'referrer', content: 'strict-origin-when-cross-origin' },
    { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
    { 'http-equiv': 'X-Frame-Options', content: 'DENY' },
    { 'http-equiv': 'Permissions-Policy', content: securityConfig.headers.permissionsPolicy },
  ];
  
  securityMetaTags.forEach(tag => {
    const meta = document.createElement('meta');
    Object.entries(tag).forEach(([key, value]) => {
      meta.setAttribute(key, value);
    });
    document.head.appendChild(meta);
  });
}

/**
 * Validates and sanitizes user input
 * @param {Object} input - The input object to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} Sanitized and validated input
 */
export function validateInput(input, schema) {
  const result = {};
  
  Object.entries(schema).forEach(([key, validator]) => {
    if (key in input) {
      result[key] = validator(input[key]);
    } else if ('default' in validator) {
      result[key] = validator.default;
    } else {
      throw new Error(`Missing required field: ${key}`);
    }
  });
  
  return result;
}
