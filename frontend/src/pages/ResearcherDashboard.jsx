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
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const loadMarketplace = async () => {
    setFetchLoading(true);
    setFetchError(null);
    try {
      await contractService.initialize({});
      const s = await contractService.getStatus();
      setStatus(s);
      const ls = await contractService.listMarketplace();
      setListings(ls ?? []);
      setLastRefreshed(new Date());
    } catch (e) {
      setFetchError(e.message ?? 'Failed to load marketplace listings');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplace();
  }, []);

  const purchase = async (listingId) => {
    setLoadingId(listingId);
    try {
      const res = await contractService.purchaseListing({ listingId, desiredAccessLevel: Number(accessLevel) || 1 });
      const msg = `Purchase successful! Access Level ${res.accessLevel}. TX: ${res.txId.slice(0,10)}...`;
      toast.success(msg);
      setStatusAnnouncement(msg);
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

        {/* Controls */}
        <SectionCard title="Filters" border="#8B5CF6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="access-level-select" className="text-sm text-[#9AA0B2]">Desired Access Level</label>
              <select
                id="access-level-select"
                value={accessLevel}
                onChange={e => setAccessLevel(e.target.value)}
                aria-describedby="access-level-hint"
                className="mt-1 w-full bg-[#14102E] border border-[#8B5CF6]/20 rounded-lg px-3 py-2 text-white"
              >
                <option value={1}>1 - Basic</option>
                <option value={2}>2 - Detailed</option>
                <option value={3}>3 - Full</option>
              </select>
              <p id="access-level-hint" className="mt-1 text-xs text-[#9AA0B2]">Only listings at or above this level will grant the selected access.</p>
            </div>
          </div>
        </SectionCard>

        {/* Listings */}
        <div className="rounded-2xl p-6 bg-[#0B0B1D]/80 backdrop-blur-xl shadow-2xl" style={{ border: '1px solid #34D39933' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Available Listings</h3>
            <div className="flex items-center gap-3">
              {lastRefreshed && !fetchLoading && (
                <span className="text-xs text-[#9AA0B2]">
                  Updated {lastRefreshed.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={loadMarketplace}
                disabled={fetchLoading}
                className="text-xs px-3 py-1.5 border border-[#34D399]/30 text-[#34D399] rounded-lg hover:bg-[#34D399]/10 transition-colors disabled:opacity-40"
              >
                {fetchLoading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="divide-y divide-[#34D399]/10">
            {fetchLoading && (
              <div className="flex items-center justify-center py-10 text-[#9AA0B2]">
                <svg className="animate-spin h-6 w-6 mr-3 text-[#34D399]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Loading listings...
              </div>
            )}
            {!fetchLoading && fetchError && (
              <div className="py-6 text-center">
                <p className="text-red-400 text-sm mb-3">{fetchError}</p>
                <button
                  onClick={loadMarketplace}
                  className="px-4 py-2 text-sm bg-[#34D399]/10 border border-[#34D399]/30 text-[#34D399] rounded-lg hover:bg-[#34D399]/20 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
            {!fetchLoading && !fetchError && listings.length === 0 && (
              <div className="py-12 text-center">
                <svg className="mx-auto mb-3 h-10 w-10 text-[#34D399]/30" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7h18M3 12h18M3 17h18" />
                </svg>
                <p className="text-[#9AA0B2] text-sm">No listings available at the moment.</p>
                <p className="text-[#9AA0B2]/60 text-xs mt-1">Check back later or ask a data owner to list their dataset.</p>
              </div>
            )}
            {!fetchLoading && listings.map(l => (
              <div key={l.listingId} className="py-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium">Listing #{l.listingId} • Dataset #{l.dataId}</div>
                  <div className="text-sm text-[#9AA0B2] flex items-center gap-2">
                    <Pill color="#8B5CF6">Access ≤ {l.accessLevel}</Pill>
                    <Pill color="#F59E0B">{(l.price / 1_000_000).toFixed(6)} STX</Pill>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => purchase(l.listingId)}
                    disabled={loadingId !== null || fetchLoading}
                    aria-label={`Purchase listing ${l.listingId} for dataset ${l.dataId} at access level ${l.accessLevel}`}
                    className="px-5 py-2 bg-gradient-to-r from-[#34D399] to-[#8B5CF6] rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
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
