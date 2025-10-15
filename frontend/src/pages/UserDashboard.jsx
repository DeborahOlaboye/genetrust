// User Dashboard: manage personal genomic vault, datasets, and listings

import React, { useEffect, useMemo, useState } from 'react';
import { contractService } from '../services/contractService.js';

const StatCard = ({ title, value, accent = 'purple' }) => (
  <div className="p-4 rounded-xl border bg-[#14102E]/60 backdrop-blur-xl shadow-lg" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
    <div className="text-sm text-[#9AA0B2] mb-1">{title}</div>
    <div className={`text-2xl font-bold ${accent === 'amber' ? 'text-[#F59E0B]' : 'text-[#8B5CF6]'}`}>{value}</div>
  </div>
);

const SectionCard = ({ title, children, border = '#8B5CF6' }) => (
  <div className="rounded-2xl p-6 bg-[#0B0B1D]/80 backdrop-blur-xl shadow-2xl" style={{ border: `1px solid ${border}33` }}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-white font-semibold">{title}</h3>
    </div>
    {children}
  </div>
);

export default function UserDashboard() {
  const [status, setStatus] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newDesc, setNewDesc] = useState('High-quality WGS sample');
  const [newPrice, setNewPrice] = useState(1000000);
  const [newAccess, setNewAccess] = useState(3);

  useEffect(() => {
    (async () => {
      await contractService.initialize({});
      const s = await contractService.getStatus();
      setStatus(s);
      const ds = await contractService.listMyDatasets();
      setDatasets(ds);
      const ls = await contractService.listMarketplace({ ownerOnly: true });
      setMyListings(ls);
    })();
  }, []);

  const handleCreateVault = async () => {
    setLoading(true);
    try {
      const sample = {
        variants: [
          { chromosome: '1', position: 123456, reference: 'A', alternate: 'G', type: 'SNP', gene: 'BRCA1' },
        ],
        genes: [{ symbol: 'BRCA1', name: 'BRCA1 DNA Repair Associated', chromosome: '17', start: 43044295, end: 43125364 }],
      };
      const ds = await contractService.createVaultDataset({ sampleData: sample, description: newDesc });
      const next = await contractService.listMyDatasets();
      setDatasets(next);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async (dataId) => {
    setLoading(true);
    try {
      await contractService.createListing({ dataId, price: Number(newPrice) || 0, accessLevel: Number(newAccess) || 1, description: newDesc });
      const ls = await contractService.listMarketplace({ ownerOnly: true });
      setMyListings(ls);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B1D] via-[#14102E] to-[#0B0B1D] text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">
            <span className="text-white">Your </span>
            <span className="bg-gradient-to-r from-[#8B5CF6] to-[#F472B6] bg-clip-text text-transparent">Genomic Vault</span>
          </h2>
          <a href="#" onClick={() => { window.location.hash = ''; }} className="text-[#9AA0B2] hover:text-white">← Back to Home</a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Datasets" value={datasets.length} />
          <StatCard title="Listings" value={myListings.length} />
          <StatCard title="SDK Status" value={status?.initialized ? 'Ready' : 'Init'} accent="amber" />
          <StatCard title="Time" value={status ? new Date(status.time).toLocaleTimeString() : '—'} />
        </div>

        {/* Create / Manage */}
        <div className="grid md:grid-cols-2 gap-6">
          <SectionCard title="Create Vault Dataset">
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="md:col-span-3">
                  <label className="text-sm text-[#9AA0B2]">Description</label>
                  <input value={newDesc} onChange={e => setNewDesc(e.target.value)} className="mt-1 w-full bg-[#14102E] border border-[#8B5CF6]/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40" placeholder="Describe your dataset" />
                </div>
              </div>
              <button onClick={handleCreateVault} disabled={loading} className="px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#F472B6] rounded-lg font-semibold disabled:opacity-60">
                {loading ? 'Processing...' : 'Create Dataset'}
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Create Listing">
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-[#9AA0B2]">Price (uSTX)</label>
                  <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="mt-1 w-full bg-[#14102E] border border-[#8B5CF6]/20 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm text-[#9AA0B2]">Access Level</label>
                  <select value={newAccess} onChange={e => setNewAccess(e.target.value)} className="mt-1 w-full bg-[#14102E] border border-[#8B5CF6]/20 rounded-lg px-3 py-2">
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="text-sm text-[#9AA0B2]">Use dataset</label>
                  <select className="mt-1 w-full bg-[#14102E] border border-[#8B5CF6]/20 rounded-lg px-3 py-2">
                    {datasets.length === 0 && <option>No datasets yet</option>}
                    {datasets.map(ds => (
                      <option key={ds.id} value={ds.id}>{ds.id} • {ds.description}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {datasets.map(ds => (
                  <button key={ds.id} onClick={() => handleCreateListing(ds.id)} disabled={loading} className="px-4 py-2 bg-[#8B5CF6]/10 text-[#C7B7FF] rounded-lg border border-[#8B5CF6]/20 hover:bg-[#8B5CF6]/20">
                    List dataset #{ds.id}
                  </button>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Tables */}
        <div className="grid md:grid-cols-2 gap-6">
          <SectionCard title="Your Datasets">
            <div className="divide-y divide-[#8B5CF6]/10">
              {datasets.length === 0 && <div className="text-[#9AA0B2]">No datasets yet.</div>}
              {datasets.map(ds => (
                <div key={ds.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">Dataset #{ds.id}</div>
                    <div className="text-sm text-[#9AA0B2]">{ds.description}</div>
                  </div>
                  <div className="text-right text-sm text-[#9AA0B2]">
                    {ds.stats.variants} variants • {ds.stats.genes} genes
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Your Listings" border="#F59E0B">
            <div className="divide-y divide-[#F59E0B]/10">
              {myListings.length === 0 && <div className="text-[#9AA0B2]">No listings yet.</div>}
              {myListings.map(l => (
                <div key={l.listingId} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">Listing #{l.listingId}</div>
                    <div className="text-sm text-[#9AA0B2]">Dataset #{l.dataId} • Access ≤ {l.accessLevel}</div>
                  </div>
                  <div className="text-right text-sm">
                    <span className="text-[#F59E0B] font-semibold">{l.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-[#8B5CF6]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-[#F472B6]/10 rounded-full blur-2xl" />
      </div>
    </div>
  );
}
