import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBurstGuard } from '../../hooks/useBurstGuard';
import { BurstLimiter, RateLimitError } from '../../utils/rateLimiter';

describe('useBurstGuard', () => {
  let limiter;

  beforeEach(() => {
    limiter = new BurstLimiter({
      maxRequests: 10,
      windowMs: 60000,
      burstMax: 2,
      burstWindowMs: 1000,
    });
  });

  it('initialises with burstExceeded=false', () => {
    const { result } = renderHook(() => useBurstGuard(limiter, 'bg'));
    expect(result.current.burstExceeded).toBe(false);
    expect(result.current.cooldownMs).toBe(0);
  });

  it('checkBurst returns true and allows calls within limit', () => {
    const { result } = renderHook(() => useBurstGuard(limiter, 'bg'));
    let ok;
    act(() => { ok = result.current.checkBurst('bg'); });
    expect(ok).toBe(true);
    act(() => { ok = result.current.checkBurst('bg'); });
    expect(ok).toBe(true);
  });

  it('checkBurst returns false and sets burstExceeded after burst limit', () => {
    const { result } = renderHook(() => useBurstGuard(limiter, 'bg2'));
    act(() => { result.current.checkBurst('bg2'); });
    act(() => { result.current.checkBurst('bg2'); });
    let ok;
    act(() => { ok = result.current.checkBurst('bg2'); });
    expect(ok).toBe(false);
    expect(result.current.burstExceeded).toBe(true);
    expect(result.current.cooldownMs).toBeGreaterThan(0);
  });

  it('guardedExecute resolves fn when within burst limit', async () => {
    const { result } = renderHook(() => useBurstGuard(limiter, 'bg3'));
    let out;
    await act(async () => {
      out = await result.current.guardedExecute(() => 'signed', 'bg3');
    });
    expect(out).toBe('signed');
  });

  it('guardedExecute throws RateLimitError when burst exceeded', async () => {
    const { result } = renderHook(() => useBurstGuard(limiter, 'bg4'));
    await act(async () => { await result.current.guardedExecute(() => 'ok', 'bg4'); });
    await act(async () => { await result.current.guardedExecute(() => 'ok', 'bg4'); });
    await expect(
      act(async () => { await result.current.guardedExecute(() => 'should fail', 'bg4'); })
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it('remaining reflects current burst token count', () => {
    const { result } = renderHook(() => useBurstGuard(limiter, 'bg5'));
    expect(result.current.remaining).toBeGreaterThan(0);
  });

  it('nearLimit is false when plenty of tokens remain', () => {
    const bigLimiter = new BurstLimiter({ maxRequests: 100, windowMs: 60000, burstMax: 20, burstWindowMs: 5000 });
    const { result } = renderHook(() => useBurstGuard(bigLimiter, 'bg6'));
    expect(result.current.nearLimit).toBe(false);
  });
});
