/**
 * UploadPage — standalone route at /upload
 * Full-screen wizard page for genomic dataset registration.
 */

import React, { useEffect, useState } from 'react';
import Navigation from '../components/landing/Navigation.jsx';
import { DatasetUploadWizard } from '../components/upload/DatasetUploadWizard.jsx';
import { WalletGate } from '../components/upload/WalletGate.jsx';
import { contractService } from '../services/contractService.js';
import { walletService } from '../services/walletService.js';
import { APP_CONFIG } from '../config/app.js';
import toast, { Toaster } from 'react-hot-toast';
import { useDatasetList } from '../hooks/useDatasetList.js';

export default function UploadPage() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [lastTxId, setLastTxId] = useState(null);
  const { datasets, refresh: refreshDatasets } = useDatasetList(contractService, false);

  useEffect(() => {
    contractService.initialize({ walletAddress: walletService.getAddress() }).catch(() => {});
    if (APP_CONFIG.USE_REAL_SDK) {
      walletService.isConnected().then((ok) => {
        if (ok) setWalletConnected(true);
      }).catch(() => {});
    }
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await walletService.connect();
      setWalletConnected(true);
      await contractService.initialize({ walletAddress: walletService.getAddress() });
      toast.success('Wallet connected!');
    } catch (e) {
      toast.error(e.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0B0B1D,#14102E,#0B0B1D)', color: '#fff' }}>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1a1a2e', color: '#fff', border: '1px solid rgba(139,92,246,0.3)' },
      }} />
      <Navigation />

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '2.5rem 1rem 4rem' }}>
        {/* Page header */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem',
            background: 'linear-gradient(135deg,#8B5CF6,#06B6D4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Register Genomic Dataset
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', margin: 0 }}>
            Securely register your genomic data on the Stacks blockchain.
            Your file is hashed locally — only the fingerprint and metadata go on-chain.
          </p>
        </div>

        {/* Wizard or wallet gate */}
        <WalletGate
          isConnected={walletConnected || !APP_CONFIG.USE_REAL_SDK}
          onConnect={handleConnect}
          connecting={connecting}
        >
          <DatasetUploadWizard
            contractService={contractService}
            walletService={walletService}
            onComplete={(txId) => {
              setLastTxId(txId);
              toast.success(`Dataset registered! TX: ${String(txId).slice(0, 12)}…`);
              refreshDatasets();
            }}
          />
        </WalletGate>

        {/* Summary strip */}
        {(lastTxId || datasets.length > 0) && (
          <div style={{
            marginTop: '1.5rem', padding: '0.75rem 1rem',
            borderRadius: '0.75rem', background: 'rgba(139,92,246,0.06)',
            border: '1px solid rgba(139,92,246,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '0.5rem',
          }}>
            {datasets.length > 0 && (
              <span style={{ color: '#9AA0B2', fontSize: '0.8rem' }}>
                You have <strong style={{ color: '#8B5CF6' }}>{datasets.length}</strong> registered dataset{datasets.length !== 1 ? 's' : ''}
              </span>
            )}
            {lastTxId && (
              <span style={{ color: '#6B7280', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                Last TX: {lastTxId}
              </span>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
