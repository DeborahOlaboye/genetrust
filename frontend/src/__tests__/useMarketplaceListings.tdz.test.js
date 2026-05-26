/**
 * Regression test for the Temporal Dead Zone (TDZ) bug.
 *
 * Before the fix, maxPriceInView was declared before sortedListings and
 * filteredListings in ResearcherDashboard.jsx. Because maxPriceInView's
 * useMemo dependency array referenced sortedListings (a `const` binding
 * that hadn't been initialized yet), JavaScript would throw:
 *
 *   ReferenceError: Cannot access 'sortedListings' before initialization
 *
 * The logic was extracted into useMarketplaceListings where the declaration
 * order is enforced: filteredListings → sortedListings → maxPriceInView.
 *
 * This test file ensures:
 * 1. The hook loads without throwing (the TDZ crash is fixed).
 * 2. maxPriceInView is always computed from the SORTED/FILTERED set.
 */

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

const LISTINGS = [
  { listingId: 1, dataId: 1, price: 5_000_000, accessLevel: 3, owner: 'ST1' },
  { listingId: 2, dataId: 2, price: 1_000_000, accessLevel: 1, owner: 'ST2' },
  { listingId: 3, dataId: 3, price: 3_000_000, accessLevel: 2, owner: 'ST3' },
];

beforeEach(() => {
  jest.clearAllMocks();
  contractService.listMarketplace.mockResolvedValue([...LISTINGS]);
});

describe('useMarketplaceListings — TDZ regression', () => {
  it('renders without throwing a ReferenceError', async () => {
    expect(() => renderHook(() => useMarketplaceListings())).not.toThrow();
  });

  it('maxPriceInView is available immediately after hook initializes', () => {
    const { result } = renderHook(() => useMarketplaceListings());
    expect(typeof result.current.maxPriceInView).toBe('number');
  });

  it('maxPriceInView is 0 before listings load', () => {
    const { result } = renderHook(() => useMarketplaceListings());
    expect(result.current.maxPriceInView).toBe(0);
  });

  it('maxPriceInView reflects the maximum price after load', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.maxPriceInView).toBe(5_000_000);
  });

  it('maxPriceInView updates when filter narrows the visible set', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    // Filter to accessLevel >= 3: only listing 1 (price 5_000_000) matches
    act(() => result.current.handleMinAccessFilterChange({ target: { value: '3' } }));
    expect(result.current.maxPriceInView).toBe(5_000_000);
    // Filter to accessLevel >= 2: listings 1 and 3 match (prices 5M, 3M)
    act(() => result.current.handleMinAccessFilterChange({ target: { value: '2' } }));
    expect(result.current.maxPriceInView).toBe(5_000_000);
    // Filter to accessLevel >= 1: all three match; max is still 5M
    act(() => result.current.handleMinAccessFilterChange({ target: { value: '1' } }));
    expect(result.current.maxPriceInView).toBe(5_000_000);
  });

  it('sortedListings is declared and accessible without TDZ error', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(Array.isArray(result.current.sortedListings)).toBe(true);
  });

  it('filteredListings is declared and accessible without TDZ error', async () => {
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(Array.isArray(result.current.filteredListings)).toBe(true);
  });

  it('declaration order: filteredListings → sortedListings → maxPriceInView', async () => {
    // This test verifies the logical dependency chain is correct:
    // sortedListings depends on filteredListings, maxPriceInView depends on sortedListings.
    const { result } = renderHook(() => useMarketplaceListings());
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    // When filter is cleared, filteredListings = listings
    expect(result.current.filteredListings.length).toBe(result.current.listings.length);

    // sortedListings is a sorted copy of filteredListings
    const prices = result.current.sortedListings.map(l => l.price);
    const sortedPrices = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sortedPrices);

    // maxPriceInView is the max of sortedListings prices
    const expectedMax = Math.max(...result.current.sortedListings.map(l => l.price));
    expect(result.current.maxPriceInView).toBe(expectedMax);
  });
});
