/**
 * ConsentPolicyForm — form to set or amend a dataset's consent policy.
 * Renders three ConsentToggles, a JurisdictionSelector, and duration input.
 */

import React, { useEffect, useState } from 'react';
import { ConsentToggle }       from './ConsentToggle.jsx';
import { JurisdictionSelector } from './JurisdictionSelector.jsx';
import { CONSENT_TYPES, DEFAULT_DURATION_BLOCKS } from '../../hooks/useConsentPolicy.js';

const inputStyle = {
  width: '100%',
  background: 'rgba(11,11,29,0.8)',
  border: '1px solid rgba(139,92,246,0.3)',
  borderRadius: '0.5rem',
  padding: '0.55rem 0.75rem',
  color: '#E5E7EB',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
};

export function ConsentPolicyForm({ existing, onSubmit, saving, error }) {
  const isAmend = Boolean(existing);

  const [research,    setResearch]    = useState(existing?.researchConsent    ?? false);
  const [commercial,  setCommercial]  = useState(existing?.commercialConsent  ?? false);
  const [clinical,    setClinical]    = useState(existing?.clinicalConsent    ?? false);
  const [jurisdiction, setJurisdiction] = useState(existing?.jurisdiction ?? 0);
  const [duration,    setDuration]    = useState(DEFAULT_DURATION_BLOCKS);

  // sync if parent refreshes existing record
  useEffect(() => {
    if (!existing) return;
    setResearch(existing.researchConsent ?? false);
    setCommercial(existing.commercialConsent ?? false);
    setClinical(existing.clinicalConsent ?? false);
    setJurisdiction(existing.jurisdiction ?? 0);
  }, [existing]);

  const noneSelected = !research && !commercial && !clinical;

  const handleSubmit = () => {
    if (noneSelected) return;
    onSubmit({ research, commercial, clinical, jurisdiction, durationBlocks: Number(duration) || DEFAULT_DURATION_BLOCKS });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Consent type toggles */}
      <div>
        <p style={{ color: '#9AA0B2', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.5rem' }}>
          Permitted Uses <span style={{ color: '#EF4444' }}>*</span>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {CONSENT_TYPES.map(({ key, label, desc, color }) => (
            <ConsentToggle
              key={key}
              label={label}
              description={desc}
              color={color}
              checked={key === 'research' ? research : key === 'commercial' ? commercial : clinical}
              onChange={key === 'research' ? setResearch : key === 'commercial' ? setCommercial : setClinical}
              disabled={saving}
            />
          ))}
        </div>
        {noneSelected && (
          <p style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.35rem' }}>
            Select at least one permitted use.
          </p>
        )}
      </div>

      {/* Jurisdiction */}
      <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} disabled={saving} />

      {/* Duration */}
      <div>
        <label htmlFor="consent-duration" style={{ color: '#9AA0B2', fontSize: '0.82rem', fontWeight: 500 }}>
          Consent Duration (blocks)
        </label>
        <input
          id="consent-duration"
          type="number"
          min="144"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          style={{ ...inputStyle, marginTop: '0.35rem' }}
        />
        <span style={{ color: '#4B5563', fontSize: '0.72rem' }}>
          ~{Math.round(Number(duration) / 144)} days ({duration} blocks)
        </span>
      </div>

      {/* Error */}
      {error && (
        <p role="alert" style={{ color: '#EF4444', fontSize: '0.82rem', margin: 0 }}>
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving || noneSelected}
        style={{
          padding: '0.7rem',
          borderRadius: '0.5rem',
          border: 'none',
          background: (saving || noneSelected) ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg,#8B5CF6,#6D28D9)',
          color: '#fff',
          fontWeight: 600,
          cursor: (saving || noneSelected) ? 'not-allowed' : 'pointer',
          fontSize: '0.9rem',
        }}
      >
        {saving ? 'Saving…' : isAmend ? 'Update Consent Policy' : 'Set Consent Policy'}
      </button>
    </div>
  );
}
