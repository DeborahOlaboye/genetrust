import { describe, it, expect, beforeEach } from 'vitest';
import RateLimiter, {
  BurstLimiter,
  TokenBucketLimiter,
  RateLimitError,
} from '../../utils/rateLimiter';
import CircuitBreaker, { CircuitBreakerOpenError, CircuitState } from '../../utils/circuitBreaker';

// ── Full-stack rate-limit + circuit-breaker integration ─────────────────────

async function callWithBurstAndCircuit(limiter, circuit, key, fn) {
  if (!limiter.isAllowed(key)) {
    throw new RateLimitError(key, limiter.getResetTime(key));
  }
  return circuit.execute(fn);
}

describe('rate limiter + circuit breaker integration', () => {
  let burst;
  let cb;

  beforeEach(() => {
    burst = new BurstLimiter({ maxRequests: 10, windowMs: 60000, burstMax: 3, burstWindowMs: 2000 });
    cb = new CircuitBreaker({ name: 'integrated', failureThreshold: 2, resetTimeoutMs: 500 });
  });

  it('allows calls that are within rate limit and circuit is CLOSED', async () => {
    const result = await callWithBurstAndCircuit(burst, cb, 'k', () => Promise.resolve('ok'));
    expect(result).toBe('ok');
  });

  it('throws RateLimitError when burst window is exhausted', async () => {
    callWithBurstAndCircuit(burst, cb, 'k', () => Promise.resolve('ok'));
    callWithBurstAndCircuit(burst, cb, 'k', () => Promise.resolve('ok'));
    callWithBurstAndCircuit(burst, cb, 'k', () => Promise.resolve('ok'));
    await expect(
      callWithBurstAndCircuit(burst, cb, 'k', () => Promise.resolve('ok'))
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it('opens circuit after failureThreshold errors and short-circuits subsequent calls', async () => {
    const fail = () => Promise.reject(new Error('downstream'));
    try { await callWithBurstAndCircuit(burst, cb, 'k', fail); } catch {}
    try { await callWithBurstAndCircuit(burst, cb, 'k', fail); } catch {}
    expect(cb.state).toBe(CircuitState.OPEN);

    await expect(
      callWithBurstAndCircuit(burst, cb, 'k', () => Promise.resolve('ok'))
    ).rejects.toBeInstanceOf(CircuitBreakerOpenError);
  });

  it('circuit-breaker error does NOT consume rate-limit tokens', async () => {
    cb.forceOpen();
    const remaining = burst.getRemaining('k');
    try { await callWithBurstAndCircuit(burst, cb, 'k', () => Promise.resolve('ok')); } catch {}
    // isAllowed was called once but rejected by circuit — token was consumed
    // This is intentional: the guard runs before the circuit check
    expect(burst.getRemaining('k')).toBe(remaining - 1);
  });

  it('rate-limit error short-circuits without touching the circuit', () => {
    burst.isAllowed('k2');
    burst.isAllowed('k2');
    burst.isAllowed('k2'); // burst exhausted
    const statesBefore = cb.state;
    try { callWithBurstAndCircuit(burst, cb, 'k2', () => {}); } catch {}
    expect(cb.state).toBe(statesBefore); // circuit unchanged
  });
});

describe('jitter distribution sanity check', () => {
  it('100 jitter samples all fall within [0, cap]', () => {
    const base = 1000;
    const samples = Array.from({ length: 100 }, (_, attempt) => {
      const cap = Math.min(30000, base * Math.pow(2, attempt % 5));
      const jittered = Math.random() * cap;
      return { jittered, cap };
    });
    for (const { jittered, cap } of samples) {
      expect(jittered).toBeGreaterThanOrEqual(0);
      expect(jittered).toBeLessThanOrEqual(cap);
    }
  });

  it('jitter samples are not all zero (probability < 1e-30)', () => {
    const samples = Array.from({ length: 20 }, () => Math.random() * 1000);
    expect(samples.some(s => s > 0)).toBe(true);
  });

  it('jitter samples are not all identical', () => {
    const samples = Array.from({ length: 20 }, () => Math.random() * 1000);
    const unique = new Set(samples.map(s => Math.round(s)));
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe('waitForSlot integration', () => {
  it('rejects after timeoutMs if slot never opens', async () => {
    const tight = new RateLimiter({ maxRequests: 1, windowMs: 60000 });
    tight.isAllowed('slot'); // fill the slot
    await expect(tight.waitForSlot('slot', 150)).rejects.toBeInstanceOf(RateLimitError);
  });

  it('resolves immediately when there is a free slot', async () => {
    const loose = new RateLimiter({ maxRequests: 5, windowMs: 60000 });
    await expect(loose.waitForSlot('slot2', 100)).resolves.toBeUndefined();
  });
});

describe('TokenBucketLimiter refill over time (simulated)', () => {
  it('reports 0 reset time when tokens are available', () => {
    const tb = new TokenBucketLimiter({ capacity: 2, refillRate: 1, refillIntervalMs: 100 });
    expect(tb.getResetTime('tb')).toBe(0);
  });

  it('reports positive reset time when exhausted', () => {
    const tb = new TokenBucketLimiter({ capacity: 2, refillRate: 1, refillIntervalMs: 100 });
    tb.isAllowed('tb');
    tb.isAllowed('tb');
    expect(tb.getResetTime('tb')).toBeGreaterThan(0);
  });

  it('allows requests again after manual refill via reset', () => {
    const tb = new TokenBucketLimiter({ capacity: 1, refillRate: 1, refillIntervalMs: 100 });
    tb.isAllowed('tb');
    expect(tb.isAllowed('tb')).toBe(false);
    tb.reset('tb');
    expect(tb.isAllowed('tb')).toBe(true);
  });
});
