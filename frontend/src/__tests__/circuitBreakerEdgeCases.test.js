import { describe, it, expect, vi, beforeEach } from 'vitest';
import CircuitBreaker, { CircuitState, CircuitBreakerOpenError } from '../../utils/circuitBreaker';

describe('CircuitBreaker — edge cases', () => {
  it('does not transition OPEN when single failure below threshold', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 100 });
    try { await cb.execute(() => Promise.reject(new Error('x'))); } catch {}
    expect(cb.state).toBe(CircuitState.CLOSED);
  });

  it('resets failure count on successful call', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    try { await cb.execute(() => Promise.reject(new Error('x'))); } catch {}
    try { await cb.execute(() => Promise.reject(new Error('x'))); } catch {}
    await cb.execute(() => Promise.resolve('ok')); // success resets count
    expect(cb.getStats().failures).toBe(0);
  });

  it('does not reopen on success in CLOSED state', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    await cb.execute(() => Promise.resolve('fine'));
    expect(cb.state).toBe(CircuitState.CLOSED);
  });

  it('retryAfterMs approaches 0 as time passes', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 500 });
    try { await cb.execute(() => Promise.reject(new Error('x'))); } catch {}
    expect(cb.state).toBe(CircuitState.OPEN);
    const t1 = cb.retryAfterMs();
    await new Promise(r => setTimeout(r, 100));
    const t2 = cb.retryAfterMs();
    expect(t2).toBeLessThan(t1);
  });

  it('multiple forceOpen calls do not change _openedAt retroactively', () => {
    const cb = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 1000 });
    cb.forceOpen();
    const first = cb._openedAt;
    // A short delay then force open again should update _openedAt
    cb.forceClose();
    cb.forceOpen();
    expect(cb._openedAt).toBeGreaterThanOrEqual(first);
  });

  it('parallel executions: all reject when OPEN', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 60000 });
    cb.forceOpen();
    const results = await Promise.allSettled([
      cb.execute(() => Promise.resolve('a')),
      cb.execute(() => Promise.resolve('b')),
      cb.execute(() => Promise.resolve('c')),
    ]);
    expect(results.every(r => r.status === 'rejected')).toBe(true);
    expect(results[0].reason).toBeInstanceOf(CircuitBreakerOpenError);
  });

  it('onStateChange is NOT called for repeated OPEN→OPEN transitions', async () => {
    const changes = [];
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 100,
      onStateChange: c => changes.push(c.to),
    });
    try { await cb.execute(() => Promise.reject(new Error('x'))); } catch {}
    const countAfterFirst = changes.length;
    // Circuit is already OPEN — forceOpen again should not fire
    cb.forceOpen();
    expect(changes.length).toBe(countAfterFirst);
  });
});
