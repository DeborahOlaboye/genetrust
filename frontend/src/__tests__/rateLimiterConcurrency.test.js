import { describe, it, expect } from 'vitest';
import RateLimiter from '../../utils/rateLimiter';

describe('RateLimiter — concurrent access', () => {
  it('correctly counts concurrent isAllowed calls', () => {
    const lim = new RateLimiter({ maxRequests: 5, windowMs: 5000 });
    const results = Array.from({ length: 7 }, () => lim.isAllowed('concurrent'));
    const allowed = results.filter(Boolean).length;
    const blocked = results.filter(r => !r).length;
    expect(allowed).toBe(5);
    expect(blocked).toBe(2);
  });

  it('independent keys do not interfere with each other', () => {
    const lim = new RateLimiter({ maxRequests: 2, windowMs: 5000 });
    lim.isAllowed('a');
    lim.isAllowed('a');
    // 'b' should still be fresh
    expect(lim.isAllowed('b')).toBe(true);
    expect(lim.isAllowed('b')).toBe(true);
    expect(lim.isAllowed('b')).toBe(false);
  });

  it('cleanup removes only fully-expired keys', () => {
    const lim = new RateLimiter({ maxRequests: 10, windowMs: 100, cleanupInterval: 1 });
    lim.isAllowed('old');
    lim.isAllowed('fresh');
    // Simulate time passing for 'old' by direct manipulation
    const oldEntries = lim.requests.get('old');
    if (oldEntries) {
      lim.requests.set('old', oldEntries.map(() => Date.now() - 200));
    }
    lim.cleanup();
    expect(lim.requests.has('old')).toBe(false);
    expect(lim.requests.has('fresh')).toBe(true);
  });

  it('getResetTime decreases over time', async () => {
    const lim = new RateLimiter({ maxRequests: 1, windowMs: 500 });
    lim.isAllowed('decrement');
    const t1 = lim.getResetTime('decrement');
    await new Promise(r => setTimeout(r, 100));
    const t2 = lim.getResetTime('decrement');
    expect(t2).toBeLessThan(t1);
  });
});
