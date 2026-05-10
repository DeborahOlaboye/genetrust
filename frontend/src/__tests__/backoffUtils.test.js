import { describe, it, expect } from 'vitest';
import { fullJitter, equalJitter, decorrelatedJitter, linearBackoff, retrySchedule } from '../../utils/backoffUtils';

describe('fullJitter', () => {
  it('always returns a value in [0, cap]', () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const cap = Math.min(30000, 1000 * Math.pow(2, attempt % 6));
      const delay = fullJitter(1000, attempt % 6);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(cap);
    }
  });

  it('respects maxMs cap', () => {
    for (let i = 0; i < 50; i++) {
      expect(fullJitter(1000, 20, 5000)).toBeLessThanOrEqual(5000);
    }
  });

  it('produces variance across calls', () => {
    const vals = Array.from({ length: 50 }, () => fullJitter(1000, 3));
    const unique = new Set(vals.map(v => Math.round(v)));
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe('equalJitter', () => {
  it('returns value in [cap/2, cap]', () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const cap = Math.min(30000, 1000 * Math.pow(2, attempt));
      const delay = equalJitter(1000, attempt);
      expect(delay).toBeGreaterThanOrEqual(cap / 2);
      expect(delay).toBeLessThanOrEqual(cap);
    }
  });
});

describe('decorrelatedJitter', () => {
  it('returns value >= base', () => {
    for (let i = 0; i < 20; i++) {
      expect(decorrelatedJitter(500, 1500)).toBeGreaterThanOrEqual(500);
    }
  });

  it('respects maxMs', () => {
    for (let i = 0; i < 20; i++) {
      expect(decorrelatedJitter(500, 5000, 3000)).toBeLessThanOrEqual(3000);
    }
  });
});

describe('linearBackoff', () => {
  it('grows linearly with attempt', () => {
    expect(linearBackoff(1000, 0)).toBe(1000);
    expect(linearBackoff(1000, 1)).toBe(2000);
    expect(linearBackoff(1000, 2)).toBe(3000);
  });

  it('caps at maxMs', () => {
    expect(linearBackoff(1000, 100, 5000)).toBe(5000);
  });
});

describe('retrySchedule generator', () => {
  it('yields exactly maxRetries values', () => {
    const delays = [...retrySchedule(1000, 30000, 4)];
    expect(delays).toHaveLength(4);
  });

  it('all yielded values are in [0, maxMs]', () => {
    for (const delay of retrySchedule(500, 8000, 10)) {
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(8000);
    }
  });

  it('stops iteration after maxRetries', () => {
    const gen = retrySchedule(100, 1000, 2);
    expect(gen.next().done).toBe(false);
    expect(gen.next().done).toBe(false);
    expect(gen.next().done).toBe(true);
  });
});
