/**
 * useMarketplaceListings — encapsulates all fetching, filtering, sorting,
 * and purchasing logic for the Researcher Marketplace page.
 *
 * Keeping this logic outside the render tree makes it independently testable
 * and keeps ResearcherDashboard focused on presentation.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { contractService } from '../services/contractService.js';

export function useMarketplaceListings() {
  const [status, setStatus] = useState(null);
  const [listings, setListings] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initError, setInitError] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [purchasedListings, setPurchasedListings] = useState(() => new Set());
  const [sortOrder, setSortOrder] = useState('asc');
  const [minAccessFilter, setMinAccessFilter] = useState(0);

  // ── Data fetching ────────────────────────────────────────────────────────

  const loadListings = useCallback(async (opts = {}) => {
    const { signal } = opts;
    try {
      await contractService.initialize({});
      const s = await contractService.getStatus();
      const ls = await contractService.listMarketplace();
      if (signal?.aborted) return;
      setStatus(s);
      setListings(ls);
      setInitError(null);
    } catch (err) {
      if (signal?.aborted) return;
      setInitError(err?.message || 'Failed to load marketplace data');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsFetching(true);
    loadListings({ signal: controller.signal }).finally(() => {
      if (!controller.signal.aborted) setIsFetching(false);
    });
    return () => controller.abort();
  }, [loadListings]);

  // ── Derived state ────────────────────────────────────────────────────────

  const filteredListings = useMemo(() => {
    if (minAccessFilter === 0) return listings;
    return listings.filter(l => l.accessLevel >= minAccessFilter);
  }, [listings, minAccessFilter]);

  const sortedListings = useMemo(() => {
    const copy = [...filteredListings];
    copy.sort((a, b) => sortOrder === 'asc' ? a.price - b.price : b.price - a.price);
    return copy;
  }, [filteredListings, sortOrder]);

  const maxPriceInView = useMemo(
    () => sortedListings.reduce((max, l) => Math.max(max, l.price ?? 0), 0),
    [sortedListings]
  );

  const isBusy = isFetching || isRefreshing;
  const purchaseCount = purchasedListings.size;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    const controller = new AbortController();
    setIsRefreshing(true);
    try {
      await loadListings({ signal: controller.signal });
    } finally {
      if (!controller.signal.aborted) setIsRefreshing(false);
    }
  }, [isRefreshing, loadListings]);

  const handleRetry = useCallback(async () => {
    setInitError(null);
    setIsFetching(true);
    const controller = new AbortController();
    try {
      await loadListings({ signal: controller.signal });
    } finally {
      if (!controller.signal.aborted) setIsFetching(false);
    }
  }, [loadListings]);

  const handleSortToggle = useCallback(() => {
    setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
  }, []);

  const handleMinAccessFilterChange = useCallback((e) => {
    setMinAccessFilter(parseInt(e.target.value, 10));
  }, []);

  const handleClearFilters = useCallback(() => {
    setMinAccessFilter(0);
    setSortOrder('asc');
  }, []);

  const purchase = useCallback(async (listingId, accessLevel) => {
    if (listingId == null) throw new Error('purchase: listingId is required');
    if (loadingId !== null) return null;
    setLoadingId(listingId);
    try {
      const res = await contractService.purchaseListing({ listingId, desiredAccessLevel: accessLevel });
      setPurchasedListings(prev => new Set([...prev, listingId]));
      return res;
    } finally {
      setLoadingId(null);
    }
  }, [loadingId]);

  return {
    // state
    status,
    listings,
    isFetching,
    isRefreshing,
    isBusy,
    initError,
    loadingId,
    purchasedListings,
    purchaseCount,
    sortOrder,
    minAccessFilter,
    // derived
    filteredListings,
    sortedListings,
    maxPriceInView,
    // handlers
    handleRefresh,
    handleRetry,
    handleSortToggle,
    handleMinAccessFilterChange,
    handleClearFilters,
    purchase,
  };
}
