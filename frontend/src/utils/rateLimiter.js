/**
 * API Rate Limiter Utility
 * Prevents abuse by throttling API requests
 */

class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 100;
    this.windowMs = options.windowMs || 60000; // 1 minute default
    this.requests = new Map();
  }

  /**
   * Check if request is allowed
   * @param {string} key - Unique identifier (e.g., endpoint or user)
   * @returns {boolean} - Whether request is allowed
   */
  isAllowed(key) {
    const now = Date.now();
    const requestLog = this.requests.get(key) || [];

    // Remove expired requests
    const validRequests = requestLog.filter(
      timestamp => now - timestamp < this.windowMs
    );

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return true;
  }

  /**
   * Get remaining requests
   * @param {string} key - Unique identifier
   * @returns {number} - Number of remaining requests
   */
  getRemaining(key) {
    const now = Date.now();
    const requestLog = this.requests.get(key) || [];
    const validRequests = requestLog.filter(
      timestamp => now - timestamp < this.windowMs
    );
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  /**
   * Cleanup expired entries
   * @private
   */
  cleanup() {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(
        timestamp => now - timestamp < this.windowMs
      );
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }

  /**
   * Reset rate limit for a key
   * @param {string} key - Unique identifier
   */
  reset(key) {
    this.requests.delete(key);
  }
}

// Create instances for different API types
export const contractApiLimiter = new RateLimiter({
  maxRequests: 50,
  windowMs: 60000, // 50 requests per minute
});

export const ipfsLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60000, // 30 requests per minute
});

export const generalApiLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000, // 100 requests per minute
});

export default RateLimiter;
