/**
 * HashProgress — animated step shown while SHA-256 hash is computed
 * and while the contract call is in-flight.
 */

import React, { useEffect, useRef } from 'react';
import { STEPS } from '../../hooks/useDatasetUpload.js';

const STAGES = [
  { step: STEPS.HASHING,    label: 'Reading file',          icon: '📂' },
  { step: STEPS.HASHING,    label: 'Computing SHA-256',      icon: '🔐' },
  { step: STEPS.SUBMITTING, label: 'Signing transaction',    icon: '✍️' },
  { step: STEPS.SUBMITTING, label: 'Broadcasting on-chain',  icon: '⛓' },
];

function Spinner() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="16" cy="16" r="12" stroke="rgba(139,92,246,0.2)" strokeWidth="3" />
      <path d="M16 4a12 12 0 0 1 12 12" stroke="#8B5CF6" strokeWidth="3"
        strokeLinecap="round" />
    </svg>
  );
}

export function HashProgress({ step, hashProgress, hexHash }) {
  const isHashing = step === STEPS.HASHING;
  const isSubmitting = step === STEPS.SUBMITTING;

  // inject keyframes once
  const injected = useRef(false);
  useEffect(() => {
    if (injected.current) return;
    injected.current = true;
    const style = document.createElement('style');
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isHashing ? `Computing hash: ${hashProgress}%` : 'Broadcasting transaction'}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '1.5rem', padding: '2rem 1rem', textAlign: 'center',
      }}
    >
      <Spinner />

      <div>
        <p style={{ color: '#E5E7EB', fontWeight: 600, fontSize: '1.05rem', margin: '0 0 0.25rem' }}>
          {isHashing ? 'Computing integrity hash…' : 'Registering on Stacks…'}
        </p>
        <p style={{ color: '#6B7280', fontSize: '0.85rem', margin: 0 }}>
          {isHashing
            ? 'Your file never leaves the browser — only the hash is stored on-chain.'
            : 'Waiting for your wallet to sign and broadcast the transaction.'}
        </p>
      </div>

      {/* Progress bar (hashing only) */}
      {isHashing && (
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <div style={{
            height: '6px', borderRadius: '999px',
            background: 'rgba(139,92,246,0.15)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${hashProgress}%`,
              background: 'linear-gradient(90deg,#8B5CF6,#6D28D9)',
              borderRadius: '999px',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <p style={{ color: '#6B7280', fontSize: '0.75rem', marginTop: '0.4rem' }}>
            {hashProgress}%
          </p>
        </div>
      )}

      {/* Hash display once computed */}
      {hexHash && (
        <div style={{
          width: '100%', maxWidth: '400px',
          padding: '0.6rem 0.75rem',
          borderRadius: '0.5rem',
          background: 'rgba(52,211,153,0.06)',
          border: '1px solid rgba(52,211,153,0.15)',
          textAlign: 'left',
        }}>
          <p style={{ color: '#34D399', fontSize: '0.72rem', margin: '0 0 0.25rem', fontWeight: 600 }}>
            SHA-256 HASH
          </p>
          <p style={{
            color: '#9AA0B2', fontSize: '0.68rem', margin: 0,
            fontFamily: 'monospace', wordBreak: 'break-all',
          }}>
            {hexHash}
          </p>
        </div>
      )}

      {/* Stage checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: '300px', textAlign: 'left' }}>
        {STAGES.map(({ label, icon }, i) => {
          const done = (isSubmitting && i < 2) || (isHashing && hashProgress >= (i === 0 ? 50 : 95) && i < 2);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.9rem' }}>{done ? '✅' : icon}</span>
              <span style={{ color: done ? '#34D399' : '#6B7280', fontSize: '0.82rem' }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
