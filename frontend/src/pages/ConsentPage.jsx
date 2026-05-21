/**
 * ConsentPage — standalone route at /consent
 * Lets users select a dataset and manage its consent policy.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Navigation from '../components/landing/Navigation.jsx';
import { ConsentManagementPanel } from '../components/consent/ConsentManagementPanel.jsx';
import { contractService } from '../services/contractService.js';
import { walletService } from '../services/walletService.js';
import { APP_CONFIG } from '../config/app.js';
import toast, { Toaster } from 'react-hot-toast';
import { SectionErrorBoundary, SkeletonLoader } from '../components/common';

const TOAST_OPTIONS = {
  style: { background: '#1a1a2e', color: '#fff', border: '1px solid rgba(139,92,246,0.3)' },
};

export default function ConsentPage() {
  const [datasets, setDatasets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadDatasets = useCallback(async () => {
    try {
      await contractService.initialize({ walletAddress: walletService.getAddress() });
      const ds = await contractService.listMyDatasets();
      setDatasets(ds ?? []);
      if (ds?.length && selectedId === null) setSelectedId(ds[0].id);
      setLoadError(null);
    } catch (err) {
      setLoadError(err?.message || 'Failed to load datasets');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  const handleRetry = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    await loadDatasets();
  }, [loadDatasets]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0B0B1D,#14102E,#0B0B1D)', color: '#fff' }}>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1a1a2e', color: '#fff', border: '1px solid rgba(139,92,246,0.3)' },
      }} />
      <Navigation />

      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '2.5rem 1rem 4rem' }}>
        {/* Page header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.4rem',
            background: 'linear-gradient(135deg,#8B5CF6,#06B6D4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Consent Management
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: 0 }}>
            Control how your genomic data may be used and exercise your GDPR rights.
          </p>
        </div>

        {/* Load error banner */}
        {loadError && (
          <div role="alert" className="mb-5 rounded-xl px-5 py-4 bg-red-900/30 border border-red-500/40 text-red-300 text-sm flex items-center justify-between gap-4">
            <span>{loadError}</span>
            <button
              onClick={handleRetry}
              disabled={loading}
              className="shrink-0 px-4 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-medium hover:bg-red-500/30 disabled:opacity-50"
            >
              {loading ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        )}

        {/* Dataset selector */}
        {!loading && datasets.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="consent-dataset-select" style={{ color: '#9AA0B2', fontSize: '0.82rem', display: 'block', marginBottom: '0.35rem' }}>
              Select Dataset
            </label>
            <select
              id="consent-dataset-select"
              value={selectedId ?? ''}
              onChange={e => setSelectedId(Number(e.target.value))}
              style={{
                width: '100%',
                background: 'rgba(11,11,29,0.8)',
                border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: '0.5rem',
                padding: '0.6rem 0.75rem',
                color: '#E5E7EB',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            >
              {datasets.map(ds => (
                <option key={ds.id} value={ds.id}>
                  Dataset #{ds.id} — {ds.description || 'No description'}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading && (
          <div style={{ marginBottom: '1.25rem' }}>
            <SkeletonLoader height="2.5rem" rounded="md" label="Loading datasets…" className="bg-white/5" />
          </div>
        )}

        {!loading && datasets.length === 0 && (
          <div style={{
            padding: '2rem', borderRadius: '1rem', textAlign: 'center',
            background: 'rgba(55,65,81,0.1)', border: '1px solid rgba(55,65,81,0.3)',
          }}>
            <p style={{ color: '#6B7280', margin: '0 0 1rem' }}>
              No datasets found. Register one first.
            </p>
            <a href="/upload" style={{
              padding: '0.6rem 1.25rem', borderRadius: '0.5rem',
              background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)',
              color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem',
            }}>
              Register Dataset →
            </a>
          </div>
        )}

        {selectedId !== null && (
          <SectionErrorBoundary sectionName="Consent Management Panel">
            <ConsentManagementPanel
              key={selectedId}
              dataId={selectedId}
              contractService={contractService}
              onSaved={() => toast.success('Consent policy saved!')}
            />
          </SectionErrorBoundary>
        )}
      </main>
    </div>
  );
}
