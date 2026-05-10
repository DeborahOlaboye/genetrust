import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenBucketLimiter } from '../../utils/rateLimiter';

describe('TokenBucketLimiter — refill over time', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('refills tokens after refillIntervalMs passes', () => {
    const tb = new TokenBucketLimiter({ capacity: 3, refillRate: 1, refillIntervalMs: 500 });
    tb.isAllowed('r'); tb.isAllowed('r'); tb.isAllowed('r'); // exhaust
    expect(tb.isAllowed('r')).toBe(false);

    vi.advanceTimersByTime(500);
    expect(tb.isAllowed('r')).toBe(true); // one token refilled
  });

  it('refills multiple tokens after multiple intervals', () => {
    const tb = new TokenBucketLimiter({ capacity: 5, refillRate: 2, refillIntervalMs: 300 });
    tb.isAllowed('m'); tb.isAllowed('m'); tb.isAllowed('m'); tb.isAllowed('m'); tb.isAllowed('m'); // exhaust 5
    expect(tb.getRemaining('m')).toBe(0);

    vi.advanceTimersByTime(600); // 2 intervals × 2 tokens = 4
    expect(tb.getRemaining('m')).toBe(4);
  });

  it('does not exceed capacity on refill', () => {
    const tb = new TokenBucketLimiter({ capacity: 3, refillRate: 2, refillIntervalMs: 100 });
    // Start at capacity, don't use any
    vi.advanceTimersByTime(500); // would add many tokens
    expect(tb.getRemaining('c')).toBe(3); // capped at capacity
  });

  it('getResetTime returns the interval length when 0 tokens remain', () => {
    const tb = new TokenBucketLimiter({ capacity: 1, refillRate: 1, refillIntervalMs: 2000 });
    tb.isAllowed('t');
    const reset = tb.getResetTime('t');
    expect(reset).toBeGreaterThan(0);
    expect(reset).toBeLessThanOrEqual(2000);
  });

  it('two different keys have independent buckets', () => {
    const tb = new TokenBucketLimiter({ capacity: 2, refillRate: 1, refillIntervalMs: 1000 });
    tb.isAllowed('x'); tb.isAllowed('x'); // exhaust x
    expect(tb.isAllowed('y')).toBe(true); // y untouched
    expect(tb.isAllowed('y')).toBe(true);
    expect(tb.isAllowed('y')).toBe(false);
  });
});
