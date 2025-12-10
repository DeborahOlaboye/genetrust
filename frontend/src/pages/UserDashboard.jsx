// User Dashboard: manage personal genomic vault, datasets, and listings

import React, { useEffect, useMemo, useState } from 'react';
import { contractService } from '../services/contractService.js';
import { walletService } from '../services/walletService.js';
import Navigation from '../components/landing/Navigation.jsx';
import { APP_CONFIG } from '../config/app.js';
import toast, { Toaster } from 'react-hot-toast';

const StatCard = ({ title, value, accent = 'purple' }) => (
  <div 
    className="p-4 rounded-xl border bg-[#14102E]/60 backdrop-blur-xl shadow-lg" 
    style={{ borderColor: 'rgba(139,92,246,0.2)' }}
    role="region"
    aria-labelledby={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <div 
      id={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className="text-sm text-[#9AA0B2] mb-1"
    >
      {title}
    </div>
    <div 
      className={`text-2xl font-bold ${accent === 'amber' ? 'text-[#F59E0B]' : 'text-[#8B5CF6]'}`}
      aria-describedby={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {value}
    </div>
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
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [error, setError] = useState(null);

  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newAccess, setNewAccess] = useState(3);
  const [selectedDataset, setSelectedDataset] = useState('');

  // Connect wallet on mount if using real SDK
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Connect wallet if using real SDK
        if (APP_CONFIG.USE_REAL_SDK) {
          const connected = await walletService.isConnected();
          if (connected) {
            const address = walletService.getAddress();
            setWalletConnected(true);
            setWalletAddress(address);
          }
        }

        // Initialize contract service
        const initResult = await contractService.initialize({
          walletAddress: walletService.getAddress()
        });

        const s = await contractService.getStatus();
        setStatus(s);

        const ds = await contractService.listMyDatasets();
        setDatasets(ds);

        const ls = await contractService.listMarketplace({ ownerOnly: true });
        setMyListings(ls);
      } catch (err) {
        console.error('Dashboard initialization error:', err);
        setError(err.message);
      }
    };

    initializeDashboard();
  }, []);

  // Handle wallet connection
  const handleConnectWallet = async () => {
    const toastId = toast.loading('Connecting wallet...');
    try {
      setLoading(true);
      await walletService.connect();
      const address = walletService.getAddress();
      setWalletConnected(true);
      setWalletAddress(address);

      // Reinitialize with wallet address
      await contractService.initialize({ walletAddress: address });
      const s = await contractService.getStatus();
      setStatus(s);

      toast.success('Wallet connected!', { id: toastId });
    } catch (err) {
      console.error('Wallet connection error:', err);
      toast.error(err.message || 'Failed to connect wallet', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVault = async () => {
    if (!newDesc.trim()) {
      toast.error('Please enter a description for your dataset');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Creating dataset...');

    try {
      const sample = {
        variants: [
          { chromosome: '1', position: 123456, reference: 'A', alternate: 'G', type: 'SNP', gene: 'BRCA1' },
        ],
        genes: [{ symbol: 'BRCA1', name: 'BRCA1 DNA Repair Associated', chromosome: '17', start: 43044295, end: 43125364 }],
      };

      const result = await contractService.createVaultDataset({ sampleData: sample, description: newDesc });
      const next = await contractService.listMyDatasets();
      setDatasets(next);

      toast.success('Dataset created successfully!', { id: toastId });
      setNewDesc(''); // Clear the input
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Failed to create dataset', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async () => {
    if (!selectedDataset) {
      toast.error('Please select a dataset to list');
      return;
    }

    if (!newPrice || Number(newPrice) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Creating listing...');

    try {
      const dataset = datasets.find(d => d.id === Number(selectedDataset));
      const description = dataset?.description || 'Genetic data listing';

      await contractService.createListing({
        dataId: Number(selectedDataset),
        price: Number(newPrice),
        accessLevel: Number(newAccess),
        description
      });

      const ls = await contractService.listMarketplace({ ownerOnly: true });
      setMyListings(ls);

      toast.success('Listing created successfully!', { id: toastId });
      // Clear form
      setNewPrice('');
      setSelectedDataset('');
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Failed to create listing', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B1D] via-[#14102E] to-[#0B0B1D] text-white">
      <a 
        href="#main-content" 
        className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-gray-900 focus:text-white focus:rounded"
      >
        Skip to main content
      </a>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a2e',
            color: '#fff',
            border: '1px solid rgba(139,92,246,0.3)',
          },
          success: {
            iconTheme: {
              primary: '#8B5CF6',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Navigation />
      <main id="main-content" className="max-w-7xl mx-auto px-6 lg:px-8 py-10 space-y-8">

        {/* Wallet Connection Status */}
        {APP_CONFIG.USE_REAL_SDK && !walletConnected && (
          <div className="p-6 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
            <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-[#9AA0B2] mb-4">To interact with the blockchain, please connect your Stacks wallet.</p>
            <button
              onClick={handleConnectWallet}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#F472B6] rounded-lg font-semibold disabled:opacity-60"
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        )}

        {/* Connection Info */}
        {walletConnected && walletAddress && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
            <strong>Wallet Connected:</strong> {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
          </div>
        )}

        {/* Stats */}
        <section aria-labelledby="dashboard-stats" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <h2 id="dashboard-stats" className="sr-only">Dashboard Statistics</h2>
          <StatCard title="Datasets" value={datasets.length} />
          <StatCard title="Listings" value={myListings.length} />
          <StatCard title="Mode" value={status?.mode || (APP_CONFIG.USE_REAL_SDK ? 'Real' : 'Mock')} accent="amber" />
          <StatCard title="Network" value={APP_CONFIG.NETWORK} />
        </section>

        {/* Create / Manage */}
        <div className="grid md:grid-cols-2 gap-6">
          <SectionCard title="Create Vault Dataset">
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="md:col-span-3">
                  <label className="text-sm text-[#9AA0B2]">Description *</label>
                  <input
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    className="mt-1 w-full bg-[#14102E] border border-[#8B5CF6]/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 text-white"
                    placeholder="Enter dataset description..."
                    disabled={loading}
                  />
                </div>
              </div>
              <button
                onClick={handleCreateVault}
                disabled={loading || !newDesc.trim()}
                className="px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#F472B6] rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Create Dataset'}
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Create Listing">
            <div className="space-y-4">
              {datasets.length === 0 ? (
                <div className="text-center py-4 text-[#9AA0B2]">
                  Create a dataset first before listing
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-[#9AA0B2]">Select Dataset *</label>
                      <select
                        value={selectedDataset}
                        onChange={e => setSelectedDataset(e.target.value)}
                        className="mt-1 w-full bg-[#14102E] border border-[#8B5CF6]/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40"
                        disabled={loading}
                      >
                        <option value="">Choose a dataset...</option>
                        {datasets.map(ds => (
                          <option key={ds.id} value={ds.id}>
                            Dataset #{ds.id} - {ds.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-[#9AA0B2]">Price (microSTX) *</label>
                      <input
                        type="number"
                        value={newPrice}
                        onChange={e => setNewPrice(e.target.value)}
                        className="mt-1 w-full bg-[#14102E] border border-[#8B5CF6]/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40"
                        placeholder="e.g., 1000000 (1 STX)"
                        disabled={loading}
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-[#9AA0B2]">Access Level</label>
                      <select
                        value={newAccess}
                        onChange={e => setNewAccess(e.target.value)}
                        className="mt-1 w-full bg-[#14102E] border border-[#8B5CF6]/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40"
                        disabled={loading}
                      >
                        <option value={1}>Level 1 - Basic</option>
                        <option value={2}>Level 2 - Detailed</option>
                        <option value={3}>Level 3 - Full Access</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleCreateListing}
                    disabled={loading || !selectedDataset || !newPrice}
                    className="px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#F472B6] rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processing...' : 'Create Listing'}
                  </button>
                </>
              )}
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
                    {ds.stats?.variants || 0} variants • {ds.stats?.genes || 0} genes
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
      </main>

      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-[#8B5CF6]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-[#F472B6]/10 rounded-full blur-2xl" />
      </div>
    </div>
  );
}
