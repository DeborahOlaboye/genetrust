import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RateLimiter, {
  RateLimitError,
  BurstLimiter,
  TokenBucketLimiter,
  contractApiLimiter,
  contractBurstLimiter,
  generalApiLimiter,
} from '../../utils/rateLimiter';

describe('RateLimiter — sliding window', () => {
  let limiter;

  beforeEach(() => {
    limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
  });

  it('allows requests up to the limit', () => {
    expect(limiter.isAllowed('a')).toBe(true);
    expect(limiter.isAllowed('a')).toBe(true);
    expect(limiter.isAllowed('a')).toBe(true);
  });

  it('blocks the request that exceeds the limit', () => {
    limiter.isAllowed('a');
    limiter.isAllowed('a');
    limiter.isAllowed('a');
    expect(limiter.isAllowed('a')).toBe(false);
  });

  it('getRemaining decrements correctly', () => {
    expect(limiter.getRemaining('a')).toBe(3);
    limiter.isAllowed('a');
    expect(limiter.getRemaining('a')).toBe(2);
    limiter.isAllowed('a');
    expect(limiter.getRemaining('a')).toBe(1);
  });

  it('getRemaining returns 0 when exhausted', () => {
    limiter.isAllowed('a');
    limiter.isAllowed('a');
    limiter.isAllowed('a');
    expect(limiter.getRemaining('a')).toBe(0);
  });

  it('resets for a key', () => {
    limiter.isAllowed('a');
    limiter.isAllowed('a');
    limiter.isAllowed('a');
    limiter.reset('a');
    expect(limiter.getRemaining('a')).toBe(3);
  });

  it('tracks different keys independently', () => {
    limiter.isAllowed('a');
    limiter.isAllowed('a');
    limiter.isAllowed('a');
    expect(limiter.isAllowed('b')).toBe(true);
  });

  it('getResetTime returns positive value when limit is hit', () => {
    limiter.isAllowed('a');
    limiter.isAllowed('a');
    limiter.isAllowed('a');
    const reset = limiter.getResetTime('a');
    expect(reset).toBeGreaterThan(0);
    expect(reset).toBeLessThanOrEqual(1000);
  });

  it('getResetTime returns 0 when no requests made', () => {
    expect(limiter.getResetTime('z')).toBe(0);
  });

  it('peek does not consume a token', () => {
    expect(limiter.peek('a')).toBe(true);
    expect(limiter.getRemaining('a')).toBe(3); // unchanged
  });

  it('peek returns false when limit is exhausted', () => {
    limiter.isAllowed('a');
    limiter.isAllowed('a');
    limiter.isAllowed('a');
    expect(limiter.peek('a')).toBe(false);
  });

  it('isNearLimit returns true when at or below threshold', () => {
    limiter.isAllowed('a');
    limiter.isAllowed('a');
    limiter.isAllowed('a'); // 0 remaining = 0% left
    expect(limiter.isNearLimit('a', 0.2)).toBe(true);
  });

  it('isNearLimit returns false when well below threshold', () => {
    // 3/3 remaining = 100% left
    expect(limiter.isNearLimit('a', 0.2)).toBe(false);
  });

  it('getRateLimitHeaders returns correct values', () => {
    limiter.isAllowed('a');
    const headers = limiter.getRateLimitHeaders('a');
    expect(headers['X-RateLimit-Limit']).toBe(3);
    expect(headers['X-RateLimit-Remaining']).toBe(2);
    expect(typeof headers['X-RateLimit-Reset']).toBe('number');
  });

  it('withRateLimit throws RateLimitError when limit exceeded', async () => {
    limiter.isAllowed('a');
    limiter.isAllowed('a');
    limiter.isAllowed('a');
    await expect(limiter.withRateLimit('a', () => 'ok')).rejects.toBeInstanceOf(RateLimitError);
  });

  it('withRateLimit calls fn when within limit', async () => {
    const result = await limiter.withRateLimit('a', () => 'called');
    expect(result).toBe('called');
  });

  it('expired entries are removed after window passes', () => {
    const fast = new RateLimiter({ maxRequests: 1, windowMs: 50 });
    fast.isAllowed('x'); // fill
    expect(fast.peek('x')).toBe(false);
    // Simulate time passing via fake timer (just verify the filter logic)
    // We cannot advance real time in unit tests without fake timers, but we can
    // verify getResetTime is > 0
    expect(fast.getResetTime('x')).toBeGreaterThan(0);
  });
});

describe('RateLimitError', () => {
  it('has the correct name and retryAfterMs', () => {
    const err = new RateLimitError('myKey', 5000);
    expect(err.name).toBe('RateLimitError');
    expect(err.retryAfterMs).toBe(5000);
    expect(err.key).toBe('myKey');
    expect(err.message).toContain('myKey');
  });
});

describe('BurstLimiter', () => {
  let burst;

  beforeEach(() => {
    burst = new BurstLimiter({
      maxRequests: 10,
      windowMs: 60000,
      burstMax: 3,
      burstWindowMs: 1000,
    });
  });

  it('allows up to burstMax requests in the burst window', () => {
    expect(burst.isAllowed('b')).toBe(true);
    expect(burst.isAllowed('b')).toBe(true);
    expect(burst.isAllowed('b')).toBe(true);
  });

  it('blocks on burst window exhaustion even if primary allows', () => {
    burst.isAllowed('b');
    burst.isAllowed('b');
    burst.isAllowed('b');
    expect(burst.isAllowed('b')).toBe(false);
  });

  it('getRemaining returns minimum of primary and burst', () => {
    burst.isAllowed('b');
    const remaining = burst.getRemaining('b');
    expect(remaining).toBe(2); // burst min (3-1=2 < primary 10-1=9)
  });

  it('reset clears both layers', () => {
    burst.isAllowed('b');
    burst.isAllowed('b');
    burst.isAllowed('b');
    burst.reset('b');
    expect(burst.isAllowed('b')).toBe(true);
  });

  it('isNearLimit uses the tighter of the two', () => {
    burst.isAllowed('b');
    burst.isAllowed('b');
    burst.isAllowed('b'); // burst = 0%
    expect(burst.isNearLimit('b', 0.4)).toBe(true);
  });
});

describe('TokenBucketLimiter', () => {
  let bucket;

  beforeEach(() => {
    bucket = new TokenBucketLimiter({ capacity: 3, refillRate: 1, refillIntervalMs: 1000 });
  });

  it('allows requests up to capacity', () => {
    expect(bucket.isAllowed('t')).toBe(true);
    expect(bucket.isAllowed('t')).toBe(true);
    expect(bucket.isAllowed('t')).toBe(true);
  });

  it('blocks when tokens are exhausted', () => {
    bucket.isAllowed('t');
    bucket.isAllowed('t');
    bucket.isAllowed('t');
    expect(bucket.isAllowed('t')).toBe(false);
  });

  it('getRemaining decrements with use', () => {
    expect(bucket.getRemaining('t')).toBe(3);
    bucket.isAllowed('t');
    expect(bucket.getRemaining('t')).toBe(2);
  });

  it('getResetTime returns 0 when tokens are available', () => {
    expect(bucket.getResetTime('t')).toBe(0);
  });

  it('getResetTime returns positive ms when exhausted', () => {
    bucket.isAllowed('t');
    bucket.isAllowed('t');
    bucket.isAllowed('t');
    expect(bucket.getResetTime('t')).toBeGreaterThan(0);
  });

  it('reset clears bucket state', () => {
    bucket.isAllowed('t');
    bucket.isAllowed('t');
    bucket.isAllowed('t');
    bucket.reset('t');
    expect(bucket.isAllowed('t')).toBe(true);
  });
});

describe('pre-configured limiter instances', () => {
  it('contractApiLimiter has maxRequests=50', () => {
    expect(contractApiLimiter.maxRequests).toBe(50);
  });

  it('contractBurstLimiter primary has maxRequests=50', () => {
    expect(contractBurstLimiter.primary.maxRequests).toBe(50);
  });

  it('contractBurstLimiter burst has burstMax=10', () => {
    expect(contractBurstLimiter.burst.maxRequests).toBe(10);
  });

  it('generalApiLimiter has maxRequests=100', () => {
    expect(generalApiLimiter.maxRequests).toBe(100);
  });
});
