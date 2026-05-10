import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRequestThrottle } from '../../hooks/useRequestThrottle';
import RateLimiter, { RateLimitError } from '../../utils/rateLimiter';

describe('useRequestThrottle', () => {
  let limiter;
  const fn = vi.fn().mockResolvedValue('result');

  beforeEach(() => {
    limiter = new RateLimiter({ maxRequests: 2, windowMs: 5000 });
    fn.mockClear();
  });

  it('initialises with isThrottled=false and retryAfterMs=0', () => {
    const { result } = renderHook(() => useRequestThrottle(fn, limiter, 'k'));
    expect(result.current.isThrottled).toBe(false);
    expect(result.current.retryAfterMs).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('throttledFn calls fn when within limit', async () => {
    const { result } = renderHook(() => useRequestThrottle(fn, limiter, 'k'));
    let out;
    await act(async () => { out = await result.current.throttledFn('arg'); });
    expect(fn).toHaveBeenCalledWith('arg');
    expect(out).toBe('result');
  });

  it('throttledFn throws RateLimitError and sets isThrottled when limit exceeded', async () => {
    const { result } = renderHook(() => useRequestThrottle(fn, limiter, 'k2'));
    await act(async () => { await result.current.throttledFn(); });
    await act(async () => { await result.current.throttledFn(); });

    await expect(
      act(async () => { await result.current.throttledFn(); })
    ).rejects.toBeInstanceOf(RateLimitError);

    expect(result.current.isThrottled).toBe(true);
    expect(result.current.retryAfterMs).toBeGreaterThan(0);
    expect(result.current.error).toBeInstanceOf(RateLimitError);
  });

  it('fn is not called when throttled', async () => {
    const { result } = renderHook(() => useRequestThrottle(fn, limiter, 'k3'));
    await act(async () => { await result.current.throttledFn(); });
    await act(async () => { await result.current.throttledFn(); });
    try {
      await act(async () => { await result.current.throttledFn(); });
    } catch {}
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('reset clears throttle state', async () => {
    const { result } = renderHook(() => useRequestThrottle(fn, limiter, 'k4'));
    await act(async () => { await result.current.throttledFn(); });
    await act(async () => { await result.current.throttledFn(); });
    try {
      await act(async () => { await result.current.throttledFn(); });
    } catch {}
    act(() => { result.current.reset(); });
    expect(result.current.isThrottled).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
