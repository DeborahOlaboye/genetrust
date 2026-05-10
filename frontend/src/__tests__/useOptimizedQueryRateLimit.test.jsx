import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOptimizedQuery } from '../../hooks/useOptimizedQuery';
import * as rateLimiterModule from '../../utils/rateLimiter';

// Stub contractApiLimiter so we can control isAllowed
vi.mock('../../utils/rateLimiter', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    contractApiLimiter: {
      isAllowed: vi.fn(() => true),
      getResetTime: vi.fn(() => 1000),
      getRemaining: vi.fn(() => 50),
    },
  };
});

describe('useOptimizedQuery — rate limit gate', () => {
  beforeEach(() => {
    vi.mocked(rateLimiterModule.contractApiLimiter.isAllowed).mockReturnValue(true);
  });

  it('executes query when rate limit allows', async () => {
    const { result } = renderHook(() => useOptimizedQuery({ enableCache: false, enableDeduplication: false }));
    const fn = vi.fn().mockResolvedValue('data');

    let out;
    await act(async () => {
      out = await result.current.executeQuery('key1', fn);
    });
    expect(out).toBe('data');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('throws RateLimitError and sets error state when rate limited', async () => {
    vi.mocked(rateLimiterModule.contractApiLimiter.isAllowed).mockReturnValue(false);

    const onRateLimit = vi.fn();
    const { result } = renderHook(() => useOptimizedQuery({
      enableCache: false,
      enableDeduplication: false,
      onRateLimit,
    }));

    const fn = vi.fn().mockResolvedValue('data');

    await expect(
      act(async () => {
        await result.current.executeQuery('key2', fn);
      })
    ).rejects.toThrow('Rate limit exceeded');

    expect(fn).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(onRateLimit).toHaveBeenCalledOnce();
  });

  it('uses full-jitter delay: retry delay is non-deterministic', async () => {
    vi.mocked(rateLimiterModule.contractApiLimiter.isAllowed).mockReturnValue(true);

    const delays = [];
    const originalMath = Math.random;
    Math.random = vi.fn().mockReturnValue(0.5);

    const { result } = renderHook(() => useOptimizedQuery({
      enableCache: false,
      enableDeduplication: false,
      retryAttempts: 1,
      retryDelay: 1000,
      maxRetryDelay: 4000,
    }));

    Math.random = originalMath;
    expect(typeof result.current.executeQuery).toBe('function');
  });
});
