import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRateLimiter } from '../../hooks/useRateLimiter';
import RateLimiter, { RateLimitError } from '../../utils/rateLimiter';

describe('useRateLimiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = new RateLimiter({ maxRequests: 3, windowMs: 5000 });
  });

  it('initialises with correct remaining count', () => {
    const { result } = renderHook(() => useRateLimiter(limiter, 'test'));
    expect(result.current.remaining).toBe(3);
    expect(result.current.isLimited).toBe(false);
  });

  it('consume decrements remaining', () => {
    const { result } = renderHook(() => useRateLimiter(limiter, 'test'));
    act(() => { result.current.consume(); });
    expect(result.current.remaining).toBe(2);
  });

  it('consume returns true when allowed', () => {
    const { result } = renderHook(() => useRateLimiter(limiter, 'test'));
    let allowed;
    act(() => { allowed = result.current.consume(); });
    expect(allowed).toBe(true);
  });

  it('consume returns false and sets isLimited when exhausted', () => {
    const { result } = renderHook(() => useRateLimiter(limiter, 'test'));
    act(() => { result.current.consume(); });
    act(() => { result.current.consume(); });
    act(() => { result.current.consume(); });
    let allowed;
    act(() => { allowed = result.current.consume(); });
    expect(allowed).toBe(false);
    expect(result.current.isLimited).toBe(true);
  });

  it('guardedCall resolves when within limit', async () => {
    const { result } = renderHook(() => useRateLimiter(limiter, 'guarded'));
    let out;
    await act(async () => {
      out = await result.current.guardedCall(() => 'success');
    });
    expect(out).toBe('success');
  });

  it('guardedCall throws RateLimitError when limit exceeded', async () => {
    const { result } = renderHook(() => useRateLimiter(limiter, 'guarded2'));
    // Exhaust the limit
    act(() => { result.current.consume(); });
    act(() => { result.current.consume(); });
    act(() => { result.current.consume(); });

    await expect(
      act(async () => { await result.current.guardedCall(() => 'should not run'); })
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it('refresh updates remaining without consuming', () => {
    const { result } = renderHook(() => useRateLimiter(limiter, 'refresh'));
    act(() => { limiter.isAllowed('refresh'); }); // consume outside the hook
    act(() => { result.current.refresh(); });
    expect(result.current.remaining).toBe(2);
  });

  it('resetTimeMs is 0 when no requests made', () => {
    const { result } = renderHook(() => useRateLimiter(limiter, 'reset'));
    expect(result.current.resetTimeMs).toBe(0);
  });
});
