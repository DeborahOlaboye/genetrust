/**
 * ConsentPage — standalone route at /consent
 * Lets users select a dataset and manage its consent policy.
 */

import React, { useEffect, useState } from 'react';
import Navigation from '../components/landing/Navigation.jsx';
import { ConsentManagementPanel } from '../components/consent/ConsentManagementPanel.jsx';
import { contractService } from '../services/contractService.js';
import { walletService } from '../services/walletService.js';
import { APP_CONFIG } from '../config/app.js';
import toast, { Toaster } from 'react-hot-toast';

export default function ConsentPage() {
  const [datasets, setDatasets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contractService
      .initialize({ walletAddress: walletService.getAddress() })
      .then(() => contractService.listMyDatasets())
      .then(ds => {
        setDatasets(ds ?? []);
        if (ds?.length) setSelectedId(ds[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
          <p style={{ color: '#6B7280', textAlign: 'center' }}>Loading datasets…</p>
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
          <ConsentManagementPanel
            key={selectedId}
            dataId={selectedId}
            contractService={contractService}
            onSaved={() => toast.success('Consent policy saved!')}
          />
        )}
      </main>
    </div>
  );
}
