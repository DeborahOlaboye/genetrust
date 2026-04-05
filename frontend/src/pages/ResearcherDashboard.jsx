import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { contractService } from '../services/contractService.js';
import Navigation from '../components/landing/Navigation.jsx';

const SectionCard = ({ title, children, border = '#34D399' }) => (
  <div className="rounded-2xl p-6 bg-[#0B0B1D]/80 backdrop-blur-xl shadow-2xl" style={{ border: `1px solid ${border}33` }}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-white font-semibold">{title}</h3>
    </div>
    {children}
  </div>
);

const Pill = ({ children, color = '#34D399' }) => (
  <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${color}1A`, color }}>
    {children}
  </span>
);

export default function ResearcherDashboard() {
  const [status, setStatus] = useState(null);
  const [listings, setListings] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [accessLevel, setAccessLevel] = useState(1);
  const [isFetching, setIsFetching] = useState(true);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await contractService.initialize({});
        const s = await contractService.getStatus();
        const ls = await contractService.listMarketplace();
        if (!mounted) return;
        setStatus(s);
        setListings(ls);
      } catch (err) {
        if (!mounted) return;
        setInitError(err?.message || 'Failed to load marketplace data');
      } finally {
        if (mounted) setIsFetching(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const purchase = async (listingId) => {
    setLoadingId(listingId);
    try {
      const res = await contractService.purchaseListing({ listingId, desiredAccessLevel: accessLevel });
      toast.success(`Access Level ${res.accessLevel} granted. TX: ${res.txId.slice(0, 10)}…`, { duration: 6000 });
    } catch (e) {
      toast.error(`Purchase failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B1D] via-[#14102E] to-[#0B0B1D] text-white">
      <Toaster position="top-right" toastOptions={{ style: { background: '#14102E', color: '#fff', border: '1px solid #8B5CF633' } }} />
      <Navigation />
      <main role="main" aria-label="Researcher marketplace" className="max-w-7xl mx-auto px-6 lg:px-8 py-10 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Researcher Marketplace</h2>
          <p className="text-sm text-[#9AA0B2] mt-1">Browse and purchase access to genomic datasets listed on-chain.</p>
        </div>

        {/* Page Header */}
        <div>
          <h2 className="text-2xl font-bold text-white">Researcher Dashboard</h2>
          <p className="mt-1 text-sm text-[#9AA0B2]">Browse and purchase access to genetic datasets on the marketplace.</p>
        </div>

        {/* Screen reader live region for loading state */}
        <div role="status" className="sr-only">
          {isFetching ? 'Loading marketplace listings…' : fetchError ? `Error: ${fetchError}` : `${listings.length} listing${listings.length !== 1 ? 's' : ''} loaded.`}
        </div>

        {/* Screen reader live region for status announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {isFetching ? 'Loading marketplace listings…' : `${listings.length} listing${listings.length !== 1 ? 's' : ''} available`}
        </div>

        {/* Initialization error banner */}
        {initError && (
          <div role="alert" className="rounded-xl px-5 py-4 bg-red-900/30 border border-red-500/40 text-red-300 text-sm">
            {initError}
          </div>
        )}

        {/* Controls */}
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
          </div>
        </SectionCard>

        {/* Listings */}
        <SectionCard title={`Available Listings${!isFetching ? ` (${listings.length})` : ''}`} border="#34D399">
          <div className="divide-y divide-[#34D399]/10" role="list">
            {isFetching && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="py-4 flex items-center justify-between animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 w-40 bg-[#8B5CF6]/20 rounded" />
                  <div className="h-3 w-28 bg-[#8B5CF6]/10 rounded" />
                </div>
                <div className="h-9 w-24 bg-[#8B5CF6]/20 rounded-lg" />
              </div>
            ))}
            {!isFetching && listings.length === 0 && !initError && (
              <div className="py-10 text-center space-y-2">
                <svg className="mx-auto h-10 w-10 text-[#8B5CF6]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                </svg>
                <p className="text-[#9AA0B2] text-sm">No listings available yet. Check back later.</p>
              </div>
            )}
            {!isFetching && listings.map(l => (
              <div key={l.listingId} className="py-4 flex items-center justify-between" role="listitem">
                <div className="space-y-1">
                  <div className="font-medium">Listing #{l.listingId} • Dataset #{l.dataId}</div>
                  <div className="text-sm text-[#9AA0B2] flex items-center gap-2 flex-wrap">
                    <Pill color="#8B5CF6">Access ≤ {l.accessLevel}</Pill>
                    <Pill color="#F59E0B">{(l.price / 1_000_000).toFixed(6)} STX</Pill>
                    {l.owner && (
                      <Pill color="#9AA0B2">Owner: {l.owner.slice(0, 6)}…{l.owner.slice(-4)}</Pill>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
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
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
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
