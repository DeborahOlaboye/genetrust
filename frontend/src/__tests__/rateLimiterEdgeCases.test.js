import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RateLimiter, { BurstLimiter, RateLimitError } from '../../utils/rateLimiter';

describe('RateLimiter — window expiry with fake timers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests again after window passes', () => {
    const lim = new RateLimiter({ maxRequests: 2, windowMs: 1000 });
    lim.isAllowed('a');
    lim.isAllowed('a');
    expect(lim.peek('a')).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(lim.peek('a')).toBe(true);
  });

  it('getResetTime returns 0 after window expires', () => {
    const lim = new RateLimiter({ maxRequests: 1, windowMs: 500 });
    lim.isAllowed('b');
    expect(lim.getResetTime('b')).toBeGreaterThan(0);

    vi.advanceTimersByTime(501);
    expect(lim.getResetTime('b')).toBe(0);
  });

  it('getRemaining is back to max after window expires', () => {
    const lim = new RateLimiter({ maxRequests: 3, windowMs: 2000 });
    lim.isAllowed('c');
    lim.isAllowed('c');
    expect(lim.getRemaining('c')).toBe(1);

    vi.advanceTimersByTime(2001);
    expect(lim.getRemaining('c')).toBe(3);
  });

  it('isNearLimit returns false again after window expires', () => {
    const lim = new RateLimiter({ maxRequests: 5, windowMs: 1000 });
    lim.isAllowed('d');
    lim.isAllowed('d');
    lim.isAllowed('d');
    lim.isAllowed('d');
    lim.isAllowed('d'); // 0 remaining
    expect(lim.isNearLimit('d', 0.5)).toBe(true);

    vi.advanceTimersByTime(1001);
    expect(lim.isNearLimit('d', 0.5)).toBe(false);
  });

  it('deterministic cleanup fires after cleanupInterval calls', () => {
    const lim = new RateLimiter({ maxRequests: 200, windowMs: 500, cleanupInterval: 5 });
    // Make 5 calls to trigger cleanup — should not throw
    for (let i = 0; i < 5; i++) lim.isAllowed('cleanup');
    // After window, entries should be pruned on next call
    vi.advanceTimersByTime(600);
    lim.isAllowed('cleanup'); // triggers cleanup
    // No assertion needed — just verify no errors thrown
    expect(lim.getRemaining('cleanup')).toBe(199);
  });
});

describe('BurstLimiter — window expiry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('burst window recovers after burstWindowMs', () => {
    const burst = new BurstLimiter({
      maxRequests: 10,
      windowMs: 60000,
      burstMax: 2,
      burstWindowMs: 500,
    });
    burst.isAllowed('x');
    burst.isAllowed('x');
    expect(burst.isAllowed('x')).toBe(false);

    vi.advanceTimersByTime(501);
    expect(burst.isAllowed('x')).toBe(true);
  });
});

describe('withRateLimit queued mode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after slot opens when queue=true', async () => {
    const lim = new RateLimiter({ maxRequests: 1, windowMs: 300 });
    lim.isAllowed('q'); // fill
    expect(lim.peek('q')).toBe(false);

    const promise = lim.withRateLimit('q', () => 'queued', { queue: true, timeoutMs: 1000 });
    vi.advanceTimersByTime(301);
    const result = await promise;
    expect(result).toBe('queued');
  });

  it('rejects with RateLimitError when timeoutMs expires', async () => {
    const lim = new RateLimiter({ maxRequests: 1, windowMs: 60000 });
    lim.isAllowed('t'); // fill for 60s
    const promise = lim.withRateLimit('t', () => 'ok', { queue: true, timeoutMs: 200 });
    vi.advanceTimersByTime(210);
    await expect(promise).rejects.toBeInstanceOf(RateLimitError);
  });
});
