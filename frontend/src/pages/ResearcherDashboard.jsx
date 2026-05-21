import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import toast, { Toaster } from 'react-hot-toast';
import { contractService } from '../services/contractService.js';
import Navigation from '../components/landing/Navigation.jsx';
import { MarketplaceListingSkeleton, SectionErrorBoundary } from '../components/common';

const formatSTX = (microSTX) => `${(microSTX / 1_000_000).toFixed(6)} STX`;

const TOAST_OPTIONS = {
  style: { background: '#14102E', color: '#fff', border: '1px solid #8B5CF633' },
};

const SectionCard = React.memo(({ title, children, border = '#34D399' }) => (
  <div className="rounded-2xl p-6 bg-[#0B0B1D]/80 backdrop-blur-xl shadow-2xl" style={{ border: `1px solid ${border}33` }}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-white font-semibold">{title}</h3>
    </div>
    {children}
  </div>
));
SectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  border: PropTypes.string,
};
SectionCard.displayName = 'SectionCard';

const Pill = React.memo(({ children, color = '#34D399' }) => (
  <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${color}1A`, color }}>
    {children}
  </span>
));
Pill.propTypes = {
  children: PropTypes.node.isRequired,
  color: PropTypes.string,
};
Pill.displayName = 'Pill';

export default function ResearcherDashboard() {
  const [status, setStatus] = useState(null);
  const [listings, setListings] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [accessLevel, setAccessLevel] = useState(1);
  const [isFetching, setIsFetching] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initError, setInitError] = useState(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState('');
  const [purchasedListings, setPurchasedListings] = useState(() => new Set());
  const [sortOrder, setSortOrder] = useState('asc');
  const [minAccessFilter, setMinAccessFilter] = useState(0);

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

  const isBusy = isFetching || isRefreshing;
  const purchaseCount = purchasedListings.size;

  const filteredListings = useMemo(() => {
    if (minAccessFilter === 0) return listings;
    return listings.filter(l => l.accessLevel >= minAccessFilter);
  }, [listings, minAccessFilter]);

  const sortedListings = useMemo(() => {
    const copy = [...filteredListings];
    copy.sort((a, b) => sortOrder === 'asc' ? a.price - b.price : b.price - a.price);
    return copy;
  }, [filteredListings, sortOrder]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadListings();
    setIsRefreshing(false);
  }, [loadListings]);

  const handleRetry = useCallback(async () => {
    setInitError(null);
    setIsFetching(true);
    await loadListings();
    setIsFetching(false);
  }, [loadListings]);

  const purchase = useCallback(async (listingId) => {
    setLoadingId(listingId);
    try {
      const res = await contractService.purchaseListing({ listingId, desiredAccessLevel: accessLevel });
      const msg = `Access Level ${res.accessLevel} granted. TX: ${res.txId.slice(0, 10)}…`;
      toast.success(msg, { duration: 6000 });
      setStatusAnnouncement(msg);
      setPurchasedListings(prev => new Set([...prev, listingId]));
    } catch (e) {
      const msg = `Purchase failed: ${e?.message || 'Unknown error'}`;
      toast.error(msg);
      setStatusAnnouncement(msg);
    } finally {
      setLoadingId(null);
    }
  }, [accessLevel]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B1D] via-[#14102E] to-[#0B0B1D] text-white">
      <Toaster position="top-right" toastOptions={TOAST_OPTIONS} />
      <Navigation />
      <main role="main" aria-label="Researcher marketplace" className="max-w-7xl mx-auto px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Researcher Marketplace</h2>
            <p className="text-sm text-[#9AA0B2] mt-1">Browse and purchase access to genomic datasets listed on-chain.</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isBusy}
            aria-label="Refresh listings"
            className="mt-1 shrink-0 px-4 py-2 rounded-lg border border-[#34D399]/30 text-[#34D399] text-sm font-medium hover:bg-[#34D399]/10 disabled:opacity-40"
          >
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Screen reader live region — single source of truth for loading/error/loaded state */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {isFetching || isRefreshing
            ? 'Loading marketplace listings…'
            : initError
              ? `Error: ${initError}`
              : `${listings.length} listing${listings.length !== 1 ? 's' : ''} loaded.`}
        </div>

        {/* Initialization error banner with retry */}
        {initError && (
          <div role="alert" className="rounded-xl px-5 py-4 bg-red-900/30 border border-red-500/40 text-red-300 text-sm flex items-center justify-between gap-4">
            <span>{initError}</span>
            <button
              onClick={handleRetry}
              disabled={isBusy}
              className="shrink-0 px-4 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-medium hover:bg-red-500/30 disabled:opacity-50"
            >
              {isFetching ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        )}

        {/* Controls */}
        <SectionErrorBoundary sectionName="Marketplace Filters">
        <SectionCard title="Filters" border="#8B5CF6" aria-label="Marketplace filters">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="access-level-select" className="text-sm text-[#9AA0B2]">Desired Access Level</label>
              <select id="access-level-select" value={accessLevel} onChange={e => setAccessLevel(parseInt(e.target.value, 10))} aria-label="Desired access level" className="mt-1 w-full bg-[#14102E] border border-[#8B5CF6]/20 rounded-lg px-3 py-2">
                <option value={1}>1 - Basic</option>
                <option value={2}>2 - Detailed</option>
                <option value={3}>3 - Full</option>
              </select>
              <p id="access-level-hint" className="mt-1 text-xs text-[#9AA0B2]">Only listings at or above this level will grant the selected access.</p>
            </div>
            <div>
              <label htmlFor="min-access-filter" className="text-sm text-[#9AA0B2]">Minimum Listing Level</label>
              <select
                id="min-access-filter"
                value={minAccessFilter}
                onChange={e => setMinAccessFilter(parseInt(e.target.value, 10))}
                className="mt-1 w-full bg-[#14102E] border border-[#8B5CF6]/20 rounded-lg px-3 py-2 text-white"
              >
                <option value={0}>All levels</option>
                <option value={1}>1 - Basic+</option>
                <option value={2}>2 - Detailed+</option>
                <option value={3}>3 - Full only</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-[#9AA0B2]">Sort by Price</label>
              <button
                onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                className="mt-1 w-full bg-[#14102E] border border-[#8B5CF6]/20 rounded-lg px-3 py-2 text-white text-left text-sm"
                aria-label={`Sort price ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              >
                Price: {sortOrder === 'asc' ? '↑ Low to High' : '↓ High to Low'}
              </button>
            </div>
          </div>
        </SectionCard>
        </SectionErrorBoundary>

        {/* Listings */}
        <SectionErrorBoundary sectionName="Marketplace Listings">
        <SectionCard
          title={!isFetching
            ? `Available Listings (${sortedListings.length}${sortedListings.length !== listings.length ? ` of ${listings.length}` : ''})`
            : 'Available Listings'}
          border="#34D399"
        >
          <div className="divide-y divide-[#34D399]/10" role="list">
            {isFetching && <MarketplaceListingSkeleton count={3} />}
            {!isFetching && listings.length === 0 && !initError && (
              <div className="py-10 text-center space-y-2">
                <svg className="mx-auto h-10 w-10 text-[#8B5CF6]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                </svg>
                <p className="text-[#9AA0B2] text-sm">No listings available yet. Check back later.</p>
              </div>
            )}
            {!isFetching && listings.length > 0 && sortedListings.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-[#9AA0B2] text-sm">No listings match your current filters.</p>
                <button onClick={() => setMinAccessFilter(0)} className="mt-2 text-xs text-[#8B5CF6] underline">
                  Clear filters
                </button>
              </div>
            )}
            {!isFetching && sortedListings.map(l => (
              <div key={l.listingId} className="py-4 flex items-center justify-between" role="listitem">
                <div className="space-y-1">
                  <div className="font-medium">Listing #{l.listingId} • Dataset #{l.dataId}</div>
                  <div className="text-sm text-[#9AA0B2] flex items-center gap-2 flex-wrap">
                    <Pill color="#8B5CF6">Access ≤ {l.accessLevel}</Pill>
                    <Pill color="#F59E0B">{formatSTX(l.price)}</Pill>
                    {l.owner && (
                      <Pill color="#9AA0B2">Owner: {l.owner.slice(0, 6)}…{l.owner.slice(-4)}</Pill>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {purchasedListings.has(l.listingId) ? (
                    <span className="px-5 py-2 rounded-lg text-sm font-semibold text-[#34D399] border border-[#34D399]/30 bg-[#34D399]/10">
                      ✓ Purchased
                    </span>
                  ) : (
                    <button
                      onClick={() => purchase(l.listingId)}
                      disabled={loadingId === l.listingId}
                      aria-busy={loadingId === l.listingId}
                      aria-label={`Purchase listing ${l.listingId}`}
                      className="px-5 py-2 bg-gradient-to-r from-[#34D399] to-[#8B5CF6] rounded-lg font-semibold disabled:opacity-60"
                    >
                      {loadingId === l.listingId ? (
                        <span role="status" className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Purchasing…
                        </span>
                      ) : 'Purchase'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        </SectionErrorBoundary>
      </main>

      {/* Screen reader live region for purchase status */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {statusAnnouncement}
      </div>

      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 right-1/3 w-32 h-32 bg-[#34D399]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-[#8B5CF6]/10 rounded-full blur-2xl" />
      </div>
    </div>
  );
}
