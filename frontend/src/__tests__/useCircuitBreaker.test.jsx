import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCircuitBreaker } from '../../hooks/useCircuitBreaker';
import CircuitBreaker, { CircuitState, CircuitBreakerOpenError } from '../../utils/circuitBreaker';

describe('useCircuitBreaker', () => {
  let cb;

  beforeEach(() => {
    cb = new CircuitBreaker({ name: 'test-hook', failureThreshold: 2, resetTimeoutMs: 200 });
  });

  it('initialises with CLOSED state', () => {
    const { result } = renderHook(() => useCircuitBreaker(cb));
    expect(result.current.circuitState).toBe(CircuitState.CLOSED);
    expect(result.current.isClosed).toBe(true);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isHalfOpen).toBe(false);
  });

  it('execute resolves the fn result', async () => {
    const { result } = renderHook(() => useCircuitBreaker(cb));
    let out;
    await act(async () => {
      out = await result.current.execute(() => Promise.resolve('data'));
    });
    expect(out).toBe('data');
  });

  it('sets lastError when fn rejects', async () => {
    const { result } = renderHook(() => useCircuitBreaker(cb));
    await expect(
      act(async () => {
        await result.current.execute(() => Promise.reject(new Error('fail')));
      })
    ).rejects.toThrow('fail');
    expect(result.current.lastError).toBeInstanceOf(Error);
  });

  it('transitions to OPEN after failureThreshold and updates state', async () => {
    const { result } = renderHook(() => useCircuitBreaker(cb));
    const fail = () => Promise.reject(new Error('down'));
    await expect(act(async () => { await result.current.execute(fail); })).rejects.toThrow();
    await expect(act(async () => { await result.current.execute(fail); })).rejects.toThrow();
    expect(result.current.isOpen).toBe(true);
    expect(result.current.retryAfterMs).toBeGreaterThan(0);
  });

  it('throws CircuitBreakerOpenError when circuit is OPEN', async () => {
    const { result } = renderHook(() => useCircuitBreaker(cb));
    cb.forceOpen();
    await expect(
      act(async () => { await result.current.execute(() => Promise.resolve('ok')); })
    ).rejects.toBeInstanceOf(CircuitBreakerOpenError);
  });

  it('retryAfterMs is 0 when CLOSED', () => {
    const { result } = renderHook(() => useCircuitBreaker(cb));
    expect(result.current.retryAfterMs).toBe(0);
  });

  it('stats shape is correct', () => {
    const { result } = renderHook(() => useCircuitBreaker(cb));
    expect(result.current.stats).toHaveProperty('state');
    expect(result.current.stats).toHaveProperty('failures');
  });
});
