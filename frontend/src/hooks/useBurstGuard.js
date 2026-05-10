import { useState, useCallback } from 'react';
import { contractBurstLimiter, RateLimitError } from '../utils/rateLimiter';

/**
 * useBurstGuard — short-window burst protection for high-frequency operations
 * like wallet signing or contract writes.
 *
 * Uses the contractBurstLimiter (10 req/5s AND 50 req/min) by default.
 */
export function useBurstGuard(limiter = contractBurstLimiter, key = 'burst') {
  const [burstExceeded, setBurstExceeded] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);

  const checkBurst = useCallback((operationKey = key) => {
    const allowed = limiter.isAllowed(operationKey);
    if (!allowed) {
      const reset = limiter.getResetTime(operationKey);
      setBurstExceeded(true);
      setCooldownMs(reset);
      setTimeout(() => {
        setBurstExceeded(false);
        setCooldownMs(0);
      }, reset);
    }
    return allowed;
  }, [limiter, key]);

  /**
   * Execute fn only if the burst guard allows it.
   * Throws RateLimitError otherwise.
   */
  const guardedExecute = useCallback(async (fn, operationKey = key) => {
    if (!checkBurst(operationKey)) {
      throw new RateLimitError(operationKey, limiter.getResetTime(operationKey));
    }
    return fn();
  }, [limiter, key, checkBurst]);

  const remaining = limiter.getRemaining(key);
  const nearLimit = limiter.isNearLimit ? limiter.isNearLimit(key, 0.3) : remaining <= 1;

  return {
    burstExceeded,
    cooldownMs,
    remaining,
    nearLimit,
    checkBurst,
    guardedExecute,
  };
}

export default useBurstGuard;
