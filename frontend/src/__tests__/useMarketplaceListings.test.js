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
  { listingId: 1, dataId: 10, price: 3_000_000, accessLevel: 2, owner: 'ST1AAA' },
  { listingId: 2, dataId: 11, price: 1_000_000, accessLevel: 1, owner: 'ST2BBB' },
  { listingId: 3, dataId: 12, price: 2_000_000, accessLevel: 3, owner: 'ST3CCC' },
];

beforeEach(() => {
  jest.clearAllMocks();
  contractService.listMarketplace.mockResolvedValue([...MOCK_LISTINGS]);
  contractService.getStatus.mockResolvedValue({ mode: 'mock' });
  contractService.initialize.mockResolvedValue({});
});

describe('useMarketplaceListings — initial state', () => {
  it('starts with isFetching true and empty listings', async () => {
    contractService.listMarketplace.mockImplementation(
      () => new Promise(() => {}) // never resolves
    );
    const { result } = renderHook(() => useMarketplaceListings());
    expect(result.current.isFetching).toBe(true);
    expect(result.current.listings).toEqual([]);
  });

  it('sets isFetching false after successful load', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
  });

  it('populates listings after successful load', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.listings).toHaveLength(3));
  });
});

describe('useMarketplaceListings — sorting', () => {
  it('default sort order is ascending by price', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    const prices = result.current.sortedListings.map(l => l.price);
    expect(prices).toEqual([1_000_000, 2_000_000, 3_000_000]);
  });

  it('toggles to descending sort on handleSortToggle', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    act(() => result.current.handleSortToggle());
    const prices = result.current.sortedListings.map(l => l.price);
    expect(prices).toEqual([3_000_000, 2_000_000, 1_000_000]);
  });

  it('toggles back to ascending on second handleSortToggle', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    act(() => result.current.handleSortToggle());
    act(() => result.current.handleSortToggle());
    expect(result.current.sortOrder).toBe('asc');
  });
});

describe('useMarketplaceListings — filtering', () => {
  it('shows all listings when minAccessFilter is 0 (default)', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.filteredListings).toHaveLength(3);
  });

  it('filters to listings with accessLevel >= minAccessFilter', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    act(() => {
      result.current.handleMinAccessFilterChange({ target: { value: '2' } });
    });
    const levels = result.current.filteredListings.map(l => l.accessLevel);
    expect(levels.every(l => l >= 2)).toBe(true);
  });

  it('handleClearFilters resets minAccessFilter to 0', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    act(() => result.current.handleMinAccessFilterChange({ target: { value: '3' } }));
    act(() => result.current.handleClearFilters());
    expect(result.current.minAccessFilter).toBe(0);
  });

  it('handleClearFilters resets sortOrder to asc', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    act(() => result.current.handleSortToggle());
    act(() => result.current.handleClearFilters());
    expect(result.current.sortOrder).toBe('asc');
  });
});

describe('useMarketplaceListings — maxPriceInView', () => {
  it('reflects the highest price across filtered+sorted listings', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.maxPriceInView).toBe(3_000_000);
  });

  it('updates when filter reduces visible listings', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    // Filter to only the listing with accessLevel=3 (price 2_000_000)
    act(() => result.current.handleMinAccessFilterChange({ target: { value: '3' } }));
    expect(result.current.maxPriceInView).toBe(2_000_000);
  });

  it('is 0 when no listings are loaded', async () => {
    contractService.listMarketplace.mockResolvedValue([]);
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.maxPriceInView).toBe(0);
  });
});

describe('useMarketplaceListings — error handling', () => {
  it('sets initError when listMarketplace rejects', async () => {
    contractService.listMarketplace.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.initError).toBe('Network error');
  });

  it('clears initError after successful handleRetry', async () => {
    contractService.listMarketplace
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue([...MOCK_LISTINGS]);
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.initError).toBe('Network error'));
    await act(() => result.current.handleRetry());
    expect(result.current.initError).toBeNull();
  });
});

describe('useMarketplaceListings — purchase', () => {
  it('returns the purchase result on success', async () => {
    const mockResult = { accessLevel: 2, txId: 'abc123def456' };
    contractService.purchaseListing.mockResolvedValue(mockResult);
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    let res;
    await act(async () => {
      res = await result.current.purchase(1, 2);
    });
    expect(res).toEqual(mockResult);
  });

  it('adds listingId to purchasedListings on success', async () => {
    contractService.purchaseListing.mockResolvedValue({ accessLevel: 1, txId: 'xyz' });
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    await act(async () => { await result.current.purchase(2, 1); });
    expect(result.current.purchasedListings.has(2)).toBe(true);
  });

  it('returns null if another purchase is already in flight', async () => {
    let resolvePurchase;
    contractService.purchaseListing.mockImplementation(
      () => new Promise(r => { resolvePurchase = r; })
    );
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    act(() => { result.current.purchase(1, 1); });
    let secondResult;
    await act(async () => {
      secondResult = await result.current.purchase(2, 1);
    });
    expect(secondResult).toBeNull();
    resolvePurchase({ accessLevel: 1, txId: 'done' });
  });
});
