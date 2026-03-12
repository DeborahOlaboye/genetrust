// Researcher Dashboard: browse marketplace listings and purchase access

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
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
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const loadData = async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      await contractService.initialize({});
      const s = await contractService.getStatus();
      setStatus(s);
      const ls = await contractService.listMarketplace();
      setListings(ls);
    } catch (err) {
      setFetchError(err?.message || 'Failed to load marketplace data. Please try again.');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const purchase = async (listingId) => {
    setLoadingId(listingId);
    try {
      const res = await contractService.purchaseListing({ listingId, desiredAccessLevel: Number(accessLevel) || 1 });
      const txShort = res?.txId ? `${res.txId.slice(0, 10)}...` : 'N/A';
      toast.success(`Purchase successful! Access Level ${res?.accessLevel ?? accessLevel}. TX: ${txShort}`);
      await loadData();
    } catch (e) {
      const errMsg = `Purchase failed: ${e.message}`;
      toast.error(errMsg);
      setStatusAnnouncement(errMsg);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B1D] via-[#14102E] to-[#0B0B1D] text-white">
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

        {/* Controls */}
        <SectionCard title="Filters" border="#8B5CF6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="access-level-select" className="text-sm text-[#9AA0B2]">Desired Access Level</label>
              <select id="access-level-select" value={accessLevel} onChange={e => setAccessLevel(e.target.value)} disabled={loadingId !== null} aria-label="Desired access level" className="mt-1 w-full bg-[#14102E] border border-[#8B5CF6]/20 rounded-lg px-3 py-2 text-white disabled:opacity-60 disabled:cursor-not-allowed">
                <option value={1}>1 - Basic</option>
                <option value={2}>2 - Detailed</option>
                <option value={3}>3 - Full</option>
              </select>
              <p id="access-level-hint" className="mt-1 text-xs text-[#9AA0B2]">Only listings at or above this level will grant the selected access.</p>
            </div>
          </div>
        </SectionCard>

        {/* Listings */}
        <SectionCard title={`Available Listings${!isFetching && listings.length > 0 ? ` (${listings.length})` : ''}`} border="#34D399">
          <div className="divide-y divide-[#34D399]/10" aria-busy={isFetching} aria-live="polite">
            {isFetching && (
              <div className="space-y-0 divide-y divide-[#34D399]/10">
                {[1, 2, 3].map(n => (
                  <div key={n} className="py-4 flex items-center justify-between animate-pulse">
                    <div className="space-y-2">
                      <div className="h-4 w-40 bg-[#8B5CF6]/20 rounded" />
                      <div className="h-3 w-28 bg-[#34D399]/10 rounded" />
                    </div>
                    <div className="h-9 w-24 bg-[#8B5CF6]/20 rounded-lg" />
                  </div>
                ))}
              </div>
            )}
            {!isFetching && fetchError && (
              <div className="py-4 space-y-2">
                <p className="text-red-400">{fetchError}</p>
                <button
                  onClick={loadData}
                  className="px-4 py-2 text-sm rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6] hover:bg-[#8B5CF6]/30 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
            {!isFetching && listings.length === 0 && !fetchError && <div className="text-[#9AA0B2] py-4">No listings available.</div>}
            {!isFetching && listings.map(l => (
              <div key={l.listingId} className="py-4 flex items-center justify-between">
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
                    disabled={isFetching || loadingId === l.listingId}
                    className="px-5 py-2 bg-gradient-to-r from-[#34D399] to-[#8B5CF6] rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                  >
                    {loadingId === l.listingId ? 'Purchasing...' : 'Purchase'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
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
