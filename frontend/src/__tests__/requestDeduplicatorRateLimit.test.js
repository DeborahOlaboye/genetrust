import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as rateLimiterModule from '../../utils/rateLimiter';
import { RateLimitError } from '../../utils/rateLimiter';

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

// Import after mock is set up
const { requestDeduplicator } = await import('../../utils/performanceOptimization');

describe('RequestDeduplicator — rate limit gate', () => {
  beforeEach(() => {
    vi.mocked(rateLimiterModule.contractApiLimiter.isAllowed).mockReturnValue(true);
    requestDeduplicator.clear();
  });

  it('executes fn when rate limit allows', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const out = await requestDeduplicator.execute('key1', fn);
    expect(out).toBe('result');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('deduplicates concurrent identical keys', async () => {
    const fn = vi.fn().mockResolvedValue('deduped');
    const [r1, r2] = await Promise.all([
      requestDeduplicator.execute('dup', fn),
      requestDeduplicator.execute('dup', fn),
    ]);
    expect(fn).toHaveBeenCalledOnce();
    expect(r1).toBe('deduped');
    expect(r2).toBe('deduped');
  });

  it('throws RateLimitError when rate limited', async () => {
    vi.mocked(rateLimiterModule.contractApiLimiter.isAllowed).mockReturnValue(false);
    const fn = vi.fn().mockResolvedValue('should not run');
    await expect(requestDeduplicator.execute('limited', fn)).rejects.toBeInstanceOf(RateLimitError);
    expect(fn).not.toHaveBeenCalled();
  });
});
