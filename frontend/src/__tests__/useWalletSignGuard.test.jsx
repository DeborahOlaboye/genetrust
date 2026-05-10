import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as rateLimiterModule from '../../utils/rateLimiter';
import { RateLimitError } from '../../utils/rateLimiter';

// Mock walletSignLimiter to control isAllowed
vi.mock('../../utils/rateLimiter', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    walletSignLimiter: {
      isAllowed: vi.fn(() => true),
      getResetTime: vi.fn(() => 2000),
    },
  };
});

// Mock wallet manager to avoid real wallet init
vi.mock('../../services/wallet/WalletManager', () => {
  const MockWalletManager = vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    signMessage: vi.fn().mockResolvedValue('0xsig'),
    sendTransaction: vi.fn().mockResolvedValue({ txId: 'tx1' }),
    getState: vi.fn().mockReturnValue({ address: null, isConnected: false }),
    getProviderStatuses: vi.fn().mockReturnValue([]),
    addListener: vi.fn().mockReturnValue(() => {}),
  }));
  return {
    default: MockWalletManager,
    PROVIDERS: { HIRO: 'hiro', REOWN: 'reown', LEDGER: 'ledger' },
  };
});

import { renderHook, act } from '@testing-library/react';
import useWallet from '../../hooks/useWallet';

describe('useWallet — walletSignLimiter guard', () => {
  beforeEach(() => {
    vi.mocked(rateLimiterModule.walletSignLimiter.isAllowed).mockReturnValue(true);
  });

  it('signMessage succeeds when rate limit allows', async () => {
    const { result } = renderHook(() => useWallet());
    let sig;
    await act(async () => {
      sig = await result.current.signMessage('hello');
    });
    expect(sig).toBe('0xsig');
  });

  it('signMessage throws RateLimitError when rate limited', async () => {
    vi.mocked(rateLimiterModule.walletSignLimiter.isAllowed)
      .mockReturnValueOnce(true)  // first check (for sign key maybe not called yet)
      .mockReturnValue(false);

    const { result } = renderHook(() => useWallet());

    // Force the guard to trigger
    vi.mocked(rateLimiterModule.walletSignLimiter.isAllowed).mockReturnValue(false);

    await expect(
      act(async () => { await result.current.signMessage('overload'); })
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it('sendTransaction throws RateLimitError when rate limited', async () => {
    vi.mocked(rateLimiterModule.walletSignLimiter.isAllowed).mockReturnValue(false);

    const { result } = renderHook(() => useWallet());

    await expect(
      act(async () => { await result.current.sendTransaction({ type: 'transfer' }); })
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it('sendTransaction succeeds when rate limit allows', async () => {
    vi.mocked(rateLimiterModule.walletSignLimiter.isAllowed).mockReturnValue(true);

    const { result } = renderHook(() => useWallet());
    let txResult;
    await act(async () => {
      txResult = await result.current.sendTransaction({ type: 'transfer' });
    });
    expect(txResult).toEqual({ txId: 'tx1' });
  });
});
