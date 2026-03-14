/**
 * UploadSuccess — step 5 shown after transaction is broadcast.
 * Renders the TransactionTracker (from issue #94) for live finality updates.
 */

import React from 'react';
import { TransactionTracker } from '../TransactionTracker.jsx';

export function UploadSuccess({ txId, hexHash, fileName, onRegisterAnother }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'rgba(52,211,153,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 0.75rem',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="#34D399" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h4 style={{ color: '#E5E7EB', margin: '0 0 0.25rem', fontWeight: 700 }}>
          Dataset Registered
        </h4>
        <p style={{ color: '#6B7280', fontSize: '0.85rem', margin: 0 }}>
          <span style={{ color: '#9AA0B2' }}>{fileName}</span> is now registered on the Stacks blockchain.
        </p>
      </div>

      {/* Hash receipt */}
      <div style={{
        padding: '0.75rem 1rem',
        borderRadius: '0.75rem',
        background: 'rgba(139,92,246,0.06)',
        border: '1px solid rgba(139,92,246,0.15)',
      }}>
        <p style={{ color: '#A78BFA', fontSize: '0.72rem', fontWeight: 600, margin: '0 0 0.3rem' }}>
          INTEGRITY HASH (SHA-256)
        </p>
        <p style={{
          color: '#9AA0B2', fontSize: '0.7rem', margin: 0,
          fontFamily: 'monospace', wordBreak: 'break-all',
        }}>
          {hexHash || '—'}
        </p>
      </div>

      {/* Live transaction tracker from issue #94 */}
      <TransactionTracker
        txId={txId}
        compact={false}
        onFastFinality={() => {}}
        onSafeFinality={() => {}}
      />

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={onRegisterAnother}
          style={{
            flex: 1,
            padding: '0.7rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(139,92,246,0.3)',
            background: 'transparent',
            color: '#A78BFA',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.875rem',
          }}
        >
          Register another dataset
        </button>
        <a
          href="/researcher"
          style={{
            flex: 1,
            padding: '0.7rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            textAlign: 'center',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          View Marketplace →
        </a>
      </div>
    </div>
  );
}
