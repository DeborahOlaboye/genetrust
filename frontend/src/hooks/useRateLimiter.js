import { useState, useCallback, useRef } from 'react';
import { contractBurstLimiter, RateLimitError } from '../utils/rateLimiter';

/**
 * useRateLimiter — exposes rate-limit awareness to React components.
 *
 * @param {object} limiter  — a RateLimiter / BurstLimiter / TokenBucketLimiter instance
 * @param {string} key      — the per-key identifier for this component's quota
 */
export function useRateLimiter(limiter = contractBurstLimiter, key = 'default') {
  const [remaining, setRemaining] = useState(() => limiter.getRemaining(key));
  const [resetTimeMs, setResetTimeMs] = useState(0);
  const [isLimited, setIsLimited] = useState(false);

  const refresh = useCallback(() => {
    const rem = limiter.getRemaining(key);
    const reset = limiter.getResetTime ? limiter.getResetTime(key) : 0;
    setRemaining(rem);
    setResetTimeMs(reset);
    setIsLimited(rem === 0);
  }, [limiter, key]);

  /**
   * Attempt to consume one token. Returns true if allowed.
   * Updates remaining/resetTime/isLimited state.
   */
  const consume = useCallback(() => {
    const allowed = limiter.isAllowed(key);
    refresh();
    return allowed;
  }, [limiter, key, refresh]);

  /**
   * Wraps an async function: checks rate limit before calling.
   * Throws RateLimitError if the limit is exceeded.
   */
  const guardedCall = useCallback(async (fn) => {
    if (!limiter.isAllowed(key)) {
      refresh();
      throw new RateLimitError(key, limiter.getResetTime ? limiter.getResetTime(key) : 0);
    }
    refresh();
    return fn();
  }, [limiter, key, refresh]);

  return {
    remaining,
    resetTimeMs,
    isLimited,
    consume,
    guardedCall,
    refresh,
  };
}

export default useRateLimiter;
