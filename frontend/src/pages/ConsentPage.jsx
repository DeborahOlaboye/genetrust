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
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B1D] via-[#14102E] to-[#0B0B1D] text-white">
      <Toaster position="top-right" toastOptions={TOAST_OPTIONS} />
      <Navigation />

      <main id="consent-main" role="main" aria-label="Consent management" className="max-w-2xl mx-auto px-4 py-10 pb-16 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold mb-1 bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">
            Consent Management
          </h1>
          <p className="text-sm text-[#6B7280]">
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
          <div>
            <label htmlFor="consent-dataset-select" className="block text-xs text-[#9AA0B2] mb-1.5">
              Select Dataset ({datasets.length})
            </label>
            <select
              id="consent-dataset-select"
              value={selectedId ?? ''}
              onChange={e => setSelectedId(Number(e.target.value))}
              className="w-full bg-[#0B0B1D]/80 border border-[#8B5CF6]/30 rounded-lg px-3 py-2.5 text-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40"
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

        {!loading && datasets.length === 0 && !loadError && (
          <div className="rounded-2xl p-8 text-center bg-gray-900/10 border border-gray-700/30">
            <p className="text-[#6B7280] text-sm mb-4">No datasets found. Register one first.</p>
            <a
              href="/upload"
              className="inline-block px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white font-semibold text-sm no-underline"
            >
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
