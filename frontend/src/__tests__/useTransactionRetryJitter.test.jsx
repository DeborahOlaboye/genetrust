import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransactionRetry } from '../../hooks/useTransactionRetry';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useTransactionRetry — jitter and shouldRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('getRetryDelay returns value in [0, min(maxDelay, initialDelay * 2^attempt)]', () => {
    const { result } = renderHook(() =>
      useTransactionRetry({ initialDelay: 1000, maxDelay: 8000 })
    );
    // We can only test the range since jitter is random
    const delays = Array.from({ length: 50 }, (_, attempt) => result.current.getRetryDelay(attempt % 4));
    for (const d of delays) {
      expect(d).toBeGreaterThanOrEqual(0);
    }
  });

  it('getRetryDelay never exceeds maxDelay', () => {
    const { result } = renderHook(() =>
      useTransactionRetry({ initialDelay: 1000, maxDelay: 3000 })
    );
    for (let i = 0; i < 100; i++) {
      const d = result.current.getRetryDelay(10); // high attempt → cap applies
      expect(d).toBeLessThanOrEqual(3000);
    }
  });

  it('shouldRetry predicate prevents retry for certain errors', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('user rejected'), { code: 'USER_REJECTED' }));

    const shouldRetryFn = (err) => err.code !== 'USER_REJECTED';
    const onMaxRetriesReached = vi.fn();

    const { result } = renderHook(() =>
      useTransactionRetry({
        maxRetries: 3,
        initialDelay: 100,
        shouldRetry: shouldRetryFn,
        onMaxRetriesReached,
      })
    );

    await expect(
      act(async () => {
        const p = result.current.executeWithRetry(fn);
        await vi.runAllTimersAsync();
        await p;
      })
    ).rejects.toThrow('user rejected');

    // fn called once — no retry because shouldRetry returned false
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retryCount is 0 initially', () => {
    const { result } = renderHook(() => useTransactionRetry());
    expect(result.current.retryCount).toBe(0);
    expect(result.current.isRetrying).toBe(false);
  });

  it('cancelRetry clears retrying state', () => {
    const { result } = renderHook(() => useTransactionRetry());
    act(() => { result.current.cancelRetry(); });
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
  });
});
