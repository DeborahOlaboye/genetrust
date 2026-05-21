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
  const [saveAnnouncement, setSaveAnnouncement] = useState('');

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

  useEffect(() => {
    if (!saveAnnouncement) return;
    const t = setTimeout(() => setSaveAnnouncement(''), 5000);
    return () => clearTimeout(t);
  }, [saveAnnouncement]);

  const handleRetry = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    await loadDatasets();
  }, [loadDatasets]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B1D] via-[#14102E] to-[#0B0B1D] text-white">
      <a
        href="#consent-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-gray-900 focus:text-white focus:rounded"
      >
        Skip to main content
      </a>
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

        {/* Screen reader live region */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {loading
            ? 'Loading your datasets…'
            : loadError
              ? `Error: ${loadError}`
              : `${datasets.length} dataset${datasets.length !== 1 ? 's' : ''} loaded.`}
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
          <SkeletonLoader height="2.5rem" rounded="md" label="Loading datasets…" className="bg-white/5" />
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

        {/* Assertive live region for save/error announcements */}
        <div aria-live="assertive" aria-atomic="true" aria-label="Consent save status" className="sr-only">
          {saveAnnouncement}
        </div>

        {selectedId !== null && (
          <SectionErrorBoundary sectionName="Consent Management Panel">
            <ConsentManagementPanel
              key={selectedId}
              dataId={selectedId}
              contractService={contractService}
              onSaved={() => {
                toast.success('Consent policy saved!');
                setSaveAnnouncement('Consent policy saved successfully.');
              }}
              onError={(err) => {
                const msg = err?.message || 'Failed to save consent policy';
                toast.error(msg);
                setSaveAnnouncement(`Error: ${msg}`);
              }}
            />
          </SectionErrorBoundary>
        )}
      </main>
    </div>
  );
}
