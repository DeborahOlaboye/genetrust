import React, { useEffect, useState } from 'react';

const DESC_MIN = 5;
const DESC_MAX = 200;
import { contractService } from '../services/contractService.js';
import { walletService } from '../services/walletService.js';
import Navigation from '../components/landing/Navigation.jsx';
import { APP_CONFIG } from '../config/app.js';
import toast, { Toaster } from 'react-hot-toast';
import { DatasetUploadWizard } from '../components/upload/DatasetUploadWizard.jsx';
import { WalletGate } from '../components/upload/WalletGate.jsx';

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
  const [isFetching, setIsFetching] = useState(true);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [error, setError] = useState(null);

  const [newDesc, setNewDesc] = useState('');
  const [descError, setDescError] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newAccess, setNewAccess] = useState(3);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  // Connect wallet on mount if using real SDK
  useEffect(() => {
    let mounted = true;
    const initializeDashboard = async () => {
      setIsFetching(true);
      try {
        // Connect wallet if using real SDK
        if (APP_CONFIG.USE_REAL_SDK) {
          const connected = await walletService.isConnected();
          if (connected) {
            const address = walletService.getAddress();
            if (mounted) {
              setWalletConnected(true);
              setWalletAddress(address);
            }
          }
        }

        // Initialize contract service
        await contractService.initialize({
          walletAddress: walletService.getAddress()
        });

        const s = await contractService.getStatus();
        const ds = await contractService.listMyDatasets();
        const ls = await contractService.listMarketplace({ ownerOnly: true });

        if (!mounted) return;
        setStatus(s);
        setDatasets(ds);
        setMyListings(ls);
      } catch (err) {
        console.error('Dashboard initialization error:', err);
        if (mounted) setError(err?.message || 'Failed to initialize dashboard');
      } finally {
        if (mounted) setIsFetching(false);
      }
    };

    initializeDashboard();
    return () => { mounted = false; };
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
    const trimmedDesc = newDesc.trim();
    if (!trimmedDesc) {
      setDescError('Description is required.');
      return;
    }
    if (trimmedDesc.length < DESC_MIN) {
      setDescError(`Description must be at least ${DESC_MIN} characters.`);
      return;
    }
    if (trimmedDesc.length > DESC_MAX) {
      setDescError(`Description must be ${DESC_MAX} characters or fewer.`);
      return;
    }
    const isDuplicate = datasets.some(
      ds => ds.description?.trim().toLowerCase() === trimmedDesc.toLowerCase()
    );
    if (isDuplicate) {
      setDescError('A dataset with this description already exists. Please use a unique description.');
      return;
    }
    setDescError('');

    setLoading(true);
    const toastId = toast.loading('Creating dataset...');

    try {
      const sample = {
        variants: [
          { chromosome: '1', position: 123456, reference: 'A', alternate: 'G', type: 'SNP', gene: 'BRCA1' },
        ],
        genes: [{ symbol: 'BRCA1', name: 'BRCA1 DNA Repair Associated', chromosome: '17', start: 43044295, end: 43125364 }],
      };

      const result = await contractService.createVaultDataset({ sampleData: sample, description: trimmedDesc });
      const next = await contractService.listMyDatasets();
      setDatasets(next);

      toast.success('Dataset created successfully!', { id: toastId });
      setNewDesc('');
      setDescError('');
    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'Failed to create dataset', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async () => {
    if (!selectedDataset) {
      toast.error('Please select a dataset to list');
      return;
    }

    const parsedPrice = Number(newPrice);
    if (!newPrice || isNaN(parsedPrice) || !Number.isInteger(parsedPrice) || parsedPrice < 1 || parsedPrice > 9_999_999_999) {
      toast.error('Price must be a whole number between 1 and 9,999,999,999 microSTX');
      return;
    }

    const duplicateListing = myListings.find(
      l => l.dataId === Number(selectedDataset) && l.accessLevel === Number(newAccess)
    );
    if (duplicateListing) {
      toast.error(`Listing #${duplicateListing.listingId} already exists for this dataset and access level.`);
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Creating listing...');

    try {
      const dataset = datasets.find(d => d.id === Number(selectedDataset));
      const description = dataset?.description || 'Genetic data listing';

      await contractService.createListing({
        dataId: Number(selectedDataset),
        price: parsedPrice,
        accessLevel: newAccess,
        description
      });

      const ls = await contractService.listMarketplace({ ownerOnly: true });
      setMyListings(ls);

      toast.success('Listing created successfully!', { id: toastId });
      // Clear form
      setNewPrice('');
      setSelectedDataset('');
      setNewAccess(3);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'Failed to create listing', { id: toastId });
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

        {/* Screen reader live region */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {isFetching ? 'Loading dashboard data…' : `Dashboard loaded: ${datasets.length} dataset${datasets.length !== 1 ? 's' : ''}, ${myListings.length} listing${myListings.length !== 1 ? 's' : ''}`}
        </div>

        {/* Initialization error banner */}
        {error && (
          <div role="alert" className="rounded-xl px-5 py-4 bg-red-900/30 border border-red-500/40 text-red-300 text-sm">
            {error}
          </div>
        )}

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
          <StatCard title="Datasets" value={isFetching ? '—' : datasets.length} />
          <StatCard title="Listings" value={isFetching ? '—' : myListings.length} />
          <StatCard title="Mode" value={status?.mode || (APP_CONFIG.USE_REAL_SDK ? 'Real' : 'Mock')} accent="amber" />
          <StatCard title="Network" value={APP_CONFIG.NETWORK} />
        </section>

        {/* Dataset Upload Wizard */}
        <section aria-labelledby="upload-wizard-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="upload-wizard-heading" className="text-white font-semibold text-base">
              Register New Dataset
            </h2>
            <button
              type="button"
              onClick={() => setShowUploadWizard(v => !v)}
              className="text-sm px-4 py-1.5 rounded-lg font-medium"
              style={{
                background: showUploadWizard ? 'rgba(139,92,246,0.15)' : 'linear-gradient(135deg,#8B5CF6,#6D28D9)',
                border: showUploadWizard ? '1px solid rgba(139,92,246,0.4)' : 'none',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {showUploadWizard ? '✕ Close' : '+ Upload & Register'}
            </button>
          </div>
          {showUploadWizard && (
            <WalletGate
              isConnected={walletConnected || !APP_CONFIG.USE_REAL_SDK}
              onConnect={handleConnectWallet}
              connecting={loading}
            >
              <DatasetUploadWizard
                contractService={contractService}
                walletService={walletService}
                onComplete={(txId) => {
                  toast.success(`Dataset registered! TX: ${String(txId).slice(0, 10)}…`);
                  setShowUploadWizard(false);
                  contractService.listMyDatasets().then(setDatasets).catch(() => {});
                }}
              />
            </WalletGate>
          )}
        </section>

        {/* Create / Manage */}
        <div className="grid md:grid-cols-2 gap-6">
          <SectionCard title="Quick Create Dataset">
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="md:col-span-3">
                  <label htmlFor="dataset-description" className="text-sm text-[#9AA0B2]">Description *</label>
                  <input
                    id="dataset-description"
                    value={newDesc}
                    onChange={e => { setNewDesc(e.target.value); if (descError) setDescError(''); }}
                    className={`mt-1 w-full bg-[#14102E] border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 text-white ${descError ? 'border-red-500/60' : 'border-[#8B5CF6]/20'}`}
                    placeholder="Enter dataset description..."
                    aria-required="true"
                    aria-invalid={!!descError}
                    aria-describedby={descError ? 'desc-error desc-counter' : 'desc-counter'}
                    maxLength={DESC_MAX}
                    disabled={loading}
                  />
                  <div className="flex justify-between mt-1">
                    {descError
                      ? <p id="desc-error" role="alert" className="text-xs text-red-400">{descError}</p>
                      : <span />
                    }
                    <span id="desc-counter" className={`text-xs ${newDesc.length > DESC_MAX - 20 ? 'text-red-400' : 'text-[#9AA0B2]'}`}>
                      {newDesc.length}/{DESC_MAX}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCreateVault}
                disabled={loading || !newDesc.trim() || !!descError}
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
                      <label htmlFor="select-dataset" className="text-sm text-[#9AA0B2]">Select Dataset *</label>
                      <select
                        id="select-dataset"
                        value={selectedDataset}
                        onChange={e => setSelectedDataset(e.target.value)}
                        className="mt-1 w-full bg-[#14102E] border border-[#8B5CF6]/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40"
                        aria-required="true"
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
                      <label htmlFor="listing-price" className="text-sm text-[#9AA0B2]">Price (microSTX) *</label>
                      <input
                        id="listing-price"
                        type="number"
                        value={newPrice}
                        onChange={e => setNewPrice(e.target.value)}
                        className="mt-1 w-full bg-[#14102E] border border-[#8B5CF6]/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40"
                        placeholder="e.g., 1000000 (1 STX)"
                        aria-required="true"
                        disabled={loading}
                        min="1"
                        step="1"
                      />
                    </div>
                    <div>
                      <label htmlFor="listing-access-level" className="text-sm text-[#9AA0B2]">Access Level</label>
                      <select
                        id="listing-access-level"
                        value={newAccess}
                        onChange={e => setNewAccess(parseInt(e.target.value, 10))}
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
            <div className="divide-y divide-[#8B5CF6]/10" role="list">
              {datasets.length === 0 && <div className="text-[#9AA0B2]">No datasets yet.</div>}
              {datasets.map(ds => (
                <div key={ds.id} role="listitem" className="py-3 flex items-center justify-between">
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
            <div className="divide-y divide-[#F59E0B]/10" role="list">
              {myListings.length === 0 && <div className="text-[#9AA0B2]">No listings yet.</div>}
              {myListings.map(l => (
                <div key={l.listingId} role="listitem" className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">Listing #{l.listingId}</div>
                    <div className="text-sm text-[#9AA0B2]">Dataset #{l.dataId} • Access ≤ {l.accessLevel}</div>
                  </div>
                  <div className="text-right text-sm">
                    <span className="text-[#F59E0B] font-semibold">{l.price} uSTX</span>
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
