import { renderHook, act, waitFor } from '@testing-library/react';
import { useMarketplaceListings } from '../hooks/useMarketplaceListings.js';
import { contractService } from '../services/contractService.js';

jest.mock('../services/contractService.js', () => ({
  contractService: {
    initialize: jest.fn().mockResolvedValue({}),
    getStatus: jest.fn().mockResolvedValue({ mode: 'mock' }),
    listMarketplace: jest.fn().mockResolvedValue([]),
    purchaseListing: jest.fn(),
  },
}));

const MOCK_LISTINGS = [
  { listingId: 10, dataId: 1, price: 500_000, accessLevel: 1, owner: 'ST1AAA' },
];

beforeEach(() => {
  jest.clearAllMocks();
  contractService.listMarketplace.mockResolvedValue([...MOCK_LISTINGS]);
});

describe('useMarketplaceListings — refresh behavior', () => {
  it('sets isRefreshing true during handleRefresh', async () => {
    let resolveRefresh;
    contractService.listMarketplace
      .mockResolvedValueOnce([...MOCK_LISTINGS])
      .mockImplementationOnce(() => new Promise(r => { resolveRefresh = r; }));

    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    act(() => { result.current.handleRefresh(); });
    expect(result.current.isRefreshing).toBe(true);

    resolveRefresh([...MOCK_LISTINGS]);
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
  });

  it('sets isRefreshing false after successful refresh', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    await act(() => result.current.handleRefresh());
    expect(result.current.isRefreshing).toBe(false);
  });

  it('prevents concurrent refresh calls', async () => {
    let resolveFirst;
    contractService.listMarketplace
      .mockResolvedValueOnce([...MOCK_LISTINGS])
      .mockImplementationOnce(() => new Promise(r => { resolveFirst = r; }));

    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    const callsBefore = contractService.listMarketplace.mock.calls.length;
    act(() => { result.current.handleRefresh(); });
    await act(() => result.current.handleRefresh());

    expect(contractService.listMarketplace.mock.calls.length).toBe(callsBefore + 1);
    resolveFirst([...MOCK_LISTINGS]);
  });

  it('updates listings after refresh', async () => {
    const updatedListings = [
      ...MOCK_LISTINGS,
      { listingId: 20, dataId: 2, price: 2_000_000, accessLevel: 2, owner: 'ST2BBB' },
    ];
    contractService.listMarketplace
      .mockResolvedValueOnce([...MOCK_LISTINGS])
      .mockResolvedValueOnce(updatedListings);

    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.listings).toHaveLength(1));
    await act(() => result.current.handleRefresh());
    expect(result.current.listings).toHaveLength(2);
  });
});

describe('useMarketplaceListings — isBusy derived state', () => {
  it('isBusy is true while isFetching', async () => {
    contractService.listMarketplace.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useMarketplaceListings());
    expect(result.current.isBusy).toBe(true);
  });

  it('isBusy is false after load completes', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isBusy).toBe(false));
  });
});

describe('useMarketplaceListings — purchaseCount', () => {
  it('starts at 0', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    expect(result.current.purchaseCount).toBe(0);
  });

  it('increments after a successful purchase', async () => {
    contractService.purchaseListing.mockResolvedValue({ accessLevel: 1, txId: 'abc' });
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    await act(async () => { await result.current.purchase(10, 1); });
    expect(result.current.purchaseCount).toBe(1);
  });
});
