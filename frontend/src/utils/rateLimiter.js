/**
 * API Rate Limiter Utility
 * Prevents abuse by throttling API requests
 */

export class RateLimitError extends Error {
  constructor(key, retryAfterMs) {
    super(`Rate limit exceeded for "${key}". Retry after ${retryAfterMs}ms.`);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
    this.key = key;
  }
}

class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 100;
    this.windowMs = options.windowMs || 60000; // 1 minute default
    this.requests = new Map();
    this._callsSinceCleanup = 0;
    this._cleanupInterval = options.cleanupInterval || 100; // deterministic cleanup every N calls
  }

  _getValid(key, now) {
    const log = this.requests.get(key);
    if (!log) return [];
    const cutoff = now - this.windowMs;
    // drop expired timestamps from the front (log is append-only → oldest first)
    let start = 0;
    while (start < log.length && log[start] <= cutoff) start++;
    const valid = start === 0 ? log : log.slice(start);
    if (valid.length !== log.length) this.requests.set(key, valid);
    return valid;
  }

  isAllowed(key) {
    const now = Date.now();
    const valid = this._getValid(key, now);

    if (valid.length >= this.maxRequests) return false;

    valid.push(now);
    this.requests.set(key, valid);

    this._callsSinceCleanup++;
    if (this._callsSinceCleanup >= this._cleanupInterval) {
      this._callsSinceCleanup = 0;
      this.cleanup();
    }

    return true;
  }

  getRemaining(key) {
    const valid = this._getValid(key, Date.now());
    return Math.max(0, this.maxRequests - valid.length);
  }

  /** Returns ms until the oldest request in the window expires (i.e., a slot opens). */
  getResetTime(key) {
    const now = Date.now();
    const valid = this._getValid(key, now);
    if (valid.length === 0) return 0;
    return Math.max(0, valid[0] + this.windowMs - now);
  }

  /** Returns a Retry-After-compatible header value object. */
  getRateLimitHeaders(key) {
    return {
      'X-RateLimit-Limit': this.maxRequests,
      'X-RateLimit-Remaining': this.getRemaining(key),
      'X-RateLimit-Reset': Math.ceil((Date.now() + this.getResetTime(key)) / 1000),
    };
  }

  /** Returns true when remaining slots are below `threshold` (fraction 0–1). */
  isNearLimit(key, threshold = 0.2) {
    return this.getRemaining(key) / this.maxRequests <= threshold;
  }

  /** Check without consuming a token. */
  peek(key) {
    const valid = this._getValid(key, Date.now());
    return valid.length < this.maxRequests;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, log] of this.requests.entries()) {
      const cutoff = now - this.windowMs;
      const valid = log.filter(ts => ts > cutoff);
      if (valid.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, valid);
      }
    }
  }

  reset(key) {
    this.requests.delete(key);
  }

  /**
   * Async wrapper that throws RateLimitError instead of returning false.
   * Optionally queues the call and resolves when a slot opens.
   */
  async withRateLimit(key, fn, { queue = false, timeoutMs = 10000 } = {}) {
    if (this.isAllowed(key)) return fn();
    if (!queue) throw new RateLimitError(key, this.getResetTime(key));
    await this.waitForSlot(key, timeoutMs);
    return fn();
  }

  /** Resolves when a slot becomes available, or rejects after timeoutMs. */
  waitForSlot(key, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const attempt = () => {
        if (this.peek(key)) return resolve();
        if (Date.now() - start >= timeoutMs) {
          return reject(new RateLimitError(key, this.getResetTime(key)));
        }
        setTimeout(attempt, Math.min(100, this.getResetTime(key) || 100));
      };
      attempt();
    });
  }
}

/**
 * BurstLimiter — enforces a tight short-window cap on top of a per-minute limit.
 * Wraps a primary RateLimiter and adds a secondary burst window.
 *
 * Example: 10 requests per 5 seconds AND 50 per minute.
 */
export class BurstLimiter {
  constructor(options = {}) {
    this.primary = new RateLimiter({
      maxRequests: options.maxRequests || 50,
      windowMs: options.windowMs || 60000,
    });
    this.burst = new RateLimiter({
      maxRequests: options.burstMax || 10,
      windowMs: options.burstWindowMs || 5000,
    });
  }

  isAllowed(key) {
    if (!this.burst.peek(key)) return false;
    if (!this.primary.peek(key)) return false;
    // Consume from both
    this.burst.isAllowed(key);
    this.primary.isAllowed(key);
    return true;
  }

  getRemaining(key) {
    return Math.min(this.burst.getRemaining(key), this.primary.getRemaining(key));
  }

  getResetTime(key) {
    return Math.min(this.burst.getResetTime(key), this.primary.getResetTime(key));
  }

  isNearLimit(key, threshold = 0.2) {
    return this.burst.isNearLimit(key, threshold) || this.primary.isNearLimit(key, threshold);
  }

  reset(key) {
    this.burst.reset(key);
    this.primary.reset(key);
  }

  async withRateLimit(key, fn, opts) {
    return this.primary.withRateLimit(key, fn, opts);
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
