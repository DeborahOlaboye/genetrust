// Researcher Dashboard: browse marketplace listings and purchase access

import React, { useEffect, useState } from 'react';
import { contractService } from '../services/contractService.js';

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

  useEffect(() => {
    (async () => {
      await contractService.initialize({});
      const s = await contractService.getStatus();
      setStatus(s);
      const ls = await contractService.listMarketplace();
      setListings(ls);
    })();
  }, []);

  const purchase = async (listingId) => {
    setLoadingId(listingId);
    try {
      const res = await contractService.purchaseListing({ listingId, desiredAccessLevel: Number(accessLevel) || 1 });
      alert(`Purchase successful! Access Level ${res.accessLevel}. TX: ${res.txId.slice(0,10)}...`);
    } catch (e) {
      alert(`Purchase failed: ${e.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B1D] via-[#14102E] to-[#0B0B1D] text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">
            <span className="text-white">Researchers </span>
            <span className="bg-gradient-to-r from-[#34D399] to-[#8B5CF6] bg-clip-text text-transparent">Marketplace</span>
          </h2>
          <a href="#" onClick={() => { window.location.hash = ''; }} className="text-[#9AA0B2] hover:text-white">← Back to Home</a>
        </div>

        {/* Controls */}
        <SectionCard title="Filters & Controls" border="#8B5CF6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-[#9AA0B2]">Desired Access Level</label>
              <select value={accessLevel} onChange={e => setAccessLevel(e.target.value)} className="mt-1 w-full bg-[#14102E] border border-[#8B5CF6]/20 rounded-lg px-3 py-2">
                <option value={1}>1 - Basic</option>
                <option value={2}>2 - Detailed</option>
                <option value={3}>3 - Full</option>
              </select>
            </div>
            <div className="md:col-span-3 flex items-end">
              <div className="text-xs text-[#9AA0B2]">SDK: {status?.initialized ? 'Ready' : 'Init'} • Listings: {status?.listings ?? 0}</div>
            </div>
          </div>
        </SectionCard>

        {/* Listings */}
        <SectionCard title="Available Listings" border="#34D399">
          <div className="divide-y divide-[#34D399]/10">
            {listings.length === 0 && <div className="text-[#9AA0B2]">No listings available.</div>}
            {listings.map(l => (
              <div key={l.listingId} className="py-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium">Listing #{l.listingId} • Dataset #{l.dataId}</div>
                  <div className="text-sm text-[#9AA0B2] flex items-center gap-2">
                    <Pill color="#8B5CF6">Access ≤ {l.accessLevel}</Pill>
                    <Pill color="#F59E0B">{l.price} uSTX</Pill>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => purchase(l.listingId)}
                    disabled={loadingId === l.listingId}
                    className="px-5 py-2 bg-gradient-to-r from-[#34D399] to-[#8B5CF6] rounded-lg font-semibold disabled:opacity-60"
                  >
                    {loadingId === l.listingId ? 'Purchasing...' : 'Purchase'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 right-1/3 w-32 h-32 bg-[#34D399]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-[#8B5CF6]/10 rounded-full blur-2xl" />
      </div>
    </div>
  );
}
