/**
 * ConsentStatusBadge — pill showing consent state at a glance.
 * ConsentSummaryCard — read-only overview of the current policy.
 */

import React from 'react';
import { JURISDICTIONS, CONSENT_TYPES } from '../../hooks/useConsentPolicy.js';

export function ConsentStatusBadge({ policy }) {
  if (!policy) {
    return (
      <span style={{
        padding: '0.2rem 0.6rem', borderRadius: '999px',
        background: 'rgba(107,114,128,0.15)', color: '#9AA0B2',
        fontSize: '0.72rem', fontWeight: 600,
      }}>
        No Policy Set
      </span>
    );
  }

  const expired = policy.consentExpiresAt && policy.consentExpiresAt < Date.now();
  if (expired) {
    return (
      <span style={{
        padding: '0.2rem 0.6rem', borderRadius: '999px',
        background: 'rgba(239,68,68,0.12)', color: '#FCA5A5',
        fontSize: '0.72rem', fontWeight: 600,
      }}>
        Expired
      </span>
    );
  }

  return (
    <span style={{
      padding: '0.2rem 0.6rem', borderRadius: '999px',
      background: 'rgba(52,211,153,0.12)', color: '#34D399',
      fontSize: '0.72rem', fontWeight: 600,
    }}>
      Active
    </span>
  );
}

export function ConsentSummaryCard({ policy, changeCount }) {
  if (!policy) {
    return (
      <div style={{
        padding: '1.25rem',
        borderRadius: '0.75rem',
        background: 'rgba(55,65,81,0.15)',
        border: '1px solid rgba(55,65,81,0.3)',
        textAlign: 'center',
      }}>
        <p style={{ color: '#6B7280', fontSize: '0.85rem', margin: 0 }}>
          No consent policy has been set for this dataset.
        </p>
      </div>
    );
  }

  const jurisdiction = JURISDICTIONS.find(j => j.value === policy.jurisdiction);
  const activeConsents = CONSENT_TYPES.filter(({ key }) =>
    key === 'research' ? policy.researchConsent : key === 'commercial' ? policy.commercialConsent : policy.clinicalConsent
  );

  return (
    <div style={{
      padding: '1rem',
      borderRadius: '0.75rem',
      background: 'rgba(11,11,29,0.6)',
      border: '1px solid rgba(139,92,246,0.15)',
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}>
      {/* Jurisdiction row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#9AA0B2', fontSize: '0.78rem' }}>Jurisdiction</span>
        <span style={{ color: '#E5E7EB', fontSize: '0.82rem', fontWeight: 600 }}>
          {jurisdiction?.flag} {jurisdiction?.label ?? 'Unknown'}
        </span>
      </div>

      {/* Permitted uses */}
      <div>
        <span style={{ color: '#9AA0B2', fontSize: '0.78rem', display: 'block', marginBottom: '0.4rem' }}>
          Permitted Uses
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {activeConsents.length === 0
            ? <span style={{ color: '#4B5563', fontSize: '0.75rem' }}>None</span>
            : activeConsents.map(({ key, label, color }) => (
              <span key={key} style={{
                padding: '0.15rem 0.5rem', borderRadius: '0.25rem',
                background: `${color}15`, color, border: `1px solid ${color}30`,
                fontSize: '0.72rem', fontWeight: 600,
              }}>
                {label}
              </span>
            ))}
        </div>
      </div>

      {/* Change count */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#9AA0B2', fontSize: '0.78rem' }}>Policy Amendments</span>
        <span style={{ color: '#E5E7EB', fontSize: '0.82rem', fontWeight: 600 }}>{changeCount}</span>
      </div>

      {/* Expiry */}
      {policy.consentExpiresAt && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9AA0B2', fontSize: '0.78rem' }}>Expires</span>
          <span style={{ color: '#E5E7EB', fontSize: '0.78rem' }}>
            {new Date(policy.consentExpiresAt).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}
