/**
 * WalletGate — renders children when wallet is connected,
 * otherwise shows a prompt to connect.  Used to guard the upload wizard.
 */

import React from 'react';

export function WalletGate({ isConnected, onConnect, connecting = false, children }) {
  if (isConnected) return children;

  return (
    <div style={{
      padding: '2rem',
      borderRadius: '1rem',
      background: 'rgba(139,92,246,0.06)',
      border: '1px solid rgba(139,92,246,0.2)',
      textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '50%',
        background: 'rgba(139,92,246,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="#8B5CF6" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3m18-3V6" />
        </svg>
      </div>

      <div>
        <p style={{ color: '#E5E7EB', fontWeight: 600, margin: '0 0 0.25rem' }}>
          Connect your wallet to register a dataset
        </p>
        <p style={{ color: '#6B7280', fontSize: '0.82rem', margin: 0 }}>
          A Stacks wallet is required to sign the on-chain registration transaction.
        </p>
      </div>

      <button
        type="button"
        onClick={onConnect}
        disabled={connecting}
        style={{
          padding: '0.65rem 1.5rem',
          borderRadius: '0.5rem',
          border: 'none',
          background: connecting ? 'rgba(139,92,246,0.4)' : 'linear-gradient(135deg,#8B5CF6,#6D28D9)',
          color: '#fff',
          fontWeight: 600,
          cursor: connecting ? 'not-allowed' : 'pointer',
          fontSize: '0.9rem',
        }}
      >
        {connecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
    </div>
  );
}
