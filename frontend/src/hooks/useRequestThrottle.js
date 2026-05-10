import { useState, useCallback, useRef } from 'react';
import { generalApiLimiter, RateLimitError } from '../utils/rateLimiter';

/**
 * useRequestThrottle — wraps an async function so it respects a rate limiter.
 *
 * @param {Function}  fn       — the async function to throttle
 * @param {object}    limiter  — a RateLimiter / BurstLimiter instance
 * @param {string}    key      — per-key quota identifier
 *
 * Returns { throttledFn, isThrottled, retryAfterMs, error, reset }
 */
export function useRequestThrottle(fn, limiter = generalApiLimiter, key = 'default') {
  const [isThrottled, setIsThrottled] = useState(false);
  const [retryAfterMs, setRetryAfterMs] = useState(0);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const clearThrottle = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsThrottled(false);
    setRetryAfterMs(0);
  }, []);

  const throttledFn = useCallback(async (...args) => {
    setError(null);

    if (!limiter.isAllowed(key)) {
      const resetMs = limiter.getResetTime ? limiter.getResetTime(key) : 1000;
      setIsThrottled(true);
      setRetryAfterMs(resetMs);

      // Auto-clear throttle state after window resets
      timerRef.current = setTimeout(clearThrottle, resetMs);

      const err = new RateLimitError(key, resetMs);
      setError(err);
      throw err;
    }

    try {
      return await fn(...args);
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [fn, limiter, key, clearThrottle]);

  const reset = useCallback(() => {
    clearThrottle();
    setError(null);
  }, [clearThrottle]);

  return { throttledFn, isThrottled, retryAfterMs, error, reset };
}

export default useRequestThrottle;
