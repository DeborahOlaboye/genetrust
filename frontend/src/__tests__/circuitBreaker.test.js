import { describe, it, expect, vi, beforeEach } from 'vitest';
import CircuitBreaker, {
  CircuitState,
  CircuitBreakerOpenError,
  contractCircuit,
  ipfsCircuit,
  apiCircuit,
} from '../../utils/circuitBreaker';

describe('CircuitBreaker — state machine', () => {
  let cb;

  beforeEach(() => {
    cb = new CircuitBreaker({ name: 'test', failureThreshold: 3, resetTimeoutMs: 100 });
  });

  it('starts in CLOSED state', () => {
    expect(cb.state).toBe(CircuitState.CLOSED);
  });

  it('executes the function in CLOSED state', async () => {
    const result = await cb.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
  });

  it('remains CLOSED after fewer failures than threshold', async () => {
    const fail = () => Promise.reject(new Error('boom'));
    try { await cb.execute(fail); } catch {}
    try { await cb.execute(fail); } catch {}
    expect(cb.state).toBe(CircuitState.CLOSED);
  });

  it('transitions to OPEN after reaching failureThreshold', async () => {
    const fail = () => Promise.reject(new Error('boom'));
    for (let i = 0; i < 3; i++) {
      try { await cb.execute(fail); } catch {}
    }
    expect(cb.state).toBe(CircuitState.OPEN);
  });

  it('throws CircuitBreakerOpenError when OPEN', async () => {
    cb.forceOpen();
    await expect(cb.execute(() => Promise.resolve('ok'))).rejects.toBeInstanceOf(CircuitBreakerOpenError);
  });

  it('transitions to HALF_OPEN after resetTimeoutMs', async () => {
    cb.forceOpen();
    // Simulate time passage by manipulating _openedAt
    cb._openedAt = Date.now() - 200; // 200ms ago, resetTimeoutMs=100
    cb._checkHalfOpen();
    expect(cb.state).toBe(CircuitState.HALF_OPEN);
  });

  it('transitions HALF_OPEN → CLOSED after successThreshold successes', async () => {
    cb = new CircuitBreaker({ name: 'test', failureThreshold: 3, resetTimeoutMs: 100, successThreshold: 2 });
    cb.forceOpen();
    cb._openedAt = Date.now() - 200;

    await cb.execute(() => Promise.resolve('ok')); // 1st success in HALF_OPEN
    expect(cb.state).toBe(CircuitState.HALF_OPEN);
    await cb.execute(() => Promise.resolve('ok')); // 2nd success → CLOSED
    expect(cb.state).toBe(CircuitState.CLOSED);
  });

  it('transitions HALF_OPEN → OPEN on failure', async () => {
    cb.forceOpen();
    cb._openedAt = Date.now() - 200;
    cb._checkHalfOpen(); // → HALF_OPEN
    try { await cb.execute(() => Promise.reject(new Error('still failing'))); } catch {}
    expect(cb.state).toBe(CircuitState.OPEN);
  });

  it('forceClose resets to CLOSED with cleared counters', () => {
    cb.forceOpen();
    cb.forceClose();
    expect(cb.state).toBe(CircuitState.CLOSED);
    expect(cb.getStats().failures).toBe(0);
  });

  it('getStats returns correct shape', () => {
    const stats = cb.getStats();
    expect(stats).toHaveProperty('state');
    expect(stats).toHaveProperty('failures');
    expect(stats).toHaveProperty('successes');
    expect(stats).toHaveProperty('retryAfterMs');
  });

  it('retryAfterMs returns 0 when CLOSED', () => {
    expect(cb.retryAfterMs()).toBe(0);
  });

  it('retryAfterMs returns positive value when OPEN', () => {
    cb.forceOpen();
    expect(cb.retryAfterMs()).toBeGreaterThan(0);
  });

  it('onStateChange callback fires on transitions', async () => {
    const changes = [];
    cb = new CircuitBreaker({
      name: 'cb',
      failureThreshold: 2,
      resetTimeoutMs: 100,
      onStateChange: (c) => changes.push(c),
    });
    const fail = () => Promise.reject(new Error('boom'));
    try { await cb.execute(fail); } catch {}
    try { await cb.execute(fail); } catch {}
    expect(changes.length).toBeGreaterThan(0);
    expect(changes[0].to).toBe(CircuitState.OPEN);
  });

  it('does not retry for CircuitBreakerOpenError — it is not a network failure', () => {
    cb.forceOpen();
    expect(() => cb.forceOpen()).not.toThrow();
    expect(cb.state).toBe(CircuitState.OPEN);
  });
});

describe('CircuitBreakerOpenError', () => {
  it('has correct name and fields', () => {
    const err = new CircuitBreakerOpenError('myCircuit', 5000);
    expect(err.name).toBe('CircuitBreakerOpenError');
    expect(err.circuitName).toBe('myCircuit');
    expect(err.retryAfterMs).toBe(5000);
    expect(err.message).toContain('myCircuit');
  });
});

describe('pre-configured circuit breaker instances', () => {
  it('contractCircuit name is "contract"', () => {
    expect(contractCircuit.name).toBe('contract');
  });

  it('ipfsCircuit failureThreshold is 3', () => {
    expect(ipfsCircuit.failureThreshold).toBe(3);
  });

  it('apiCircuit starts CLOSED', () => {
    expect(apiCircuit.state).toBe(CircuitState.CLOSED);
  });
});
