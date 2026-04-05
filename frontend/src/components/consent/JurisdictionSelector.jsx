/**
 * JurisdictionSelector — pill-style selector for legal jurisdiction.
 * Shows flag + label for each of the five supported jurisdictions.
 * EU selection triggers a GDPR notice banner.
 */

import React from 'react';
import { JURISDICTIONS } from '../../hooks/useConsentPolicy.js';

export function JurisdictionSelector({ value, onChange, disabled = false }) {
  return (
    <div>
      <span style={{
        display: 'block',
        color: '#9AA0B2', fontSize: '0.82rem', fontWeight: 500,
        marginBottom: '0.6rem',
      }}>
        Legal Jurisdiction <span style={{ color: '#EF4444' }}>*</span>
      </span>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {JURISDICTIONS.map(({ value: v, label, flag }) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => !disabled && onChange(v)}
              disabled={disabled}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '999px',
                border: active ? '1px solid #8B5CF6' : '1px solid rgba(55,65,81,0.6)',
                background: active ? 'rgba(139,92,246,0.15)' : 'rgba(11,11,29,0.6)',
                color: active ? '#E5E7EB' : '#6B7280',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}
            >
              <span>{flag}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* GDPR notice for EU */}
      {value === 2 && (
        <div style={{
          marginTop: '0.6rem',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          background: 'rgba(6,182,212,0.06)',
          border: '1px solid rgba(6,182,212,0.2)',
          display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
        }}>
          <span style={{ fontSize: '0.85rem', marginTop: '0.05rem' }}>ℹ️</span>
          <p style={{ color: '#67E8F9', fontSize: '0.75rem', margin: 0, lineHeight: 1.5 }}>
            EU (GDPR) jurisdiction activates Article 17 erasure, Article 20 portability,
            and processing restriction rights for this dataset.
          </p>
        </div>
      )}
    </div>
  );
}
