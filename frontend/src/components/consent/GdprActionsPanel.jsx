/**
 * GdprActionsPanel — Article 17/20/18 action buttons for EU datasets.
 * Only rendered when jurisdiction === 2 (EU/GDPR).
 */

import React from 'react';

const ActionRow = ({ icon, title, description, buttonLabel, buttonColor = '#8B5CF6', onClick, disabled, done, doneLabel }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: '1rem', padding: '0.875rem 0',
    borderBottom: '1px solid rgba(55,65,81,0.3)',
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
      <span style={{ fontSize: '1.1rem', marginTop: '0.1rem' }}>{icon}</span>
      <div>
        <p style={{ color: '#E5E7EB', fontWeight: 600, fontSize: '0.85rem', margin: '0 0 0.15rem' }}>{title}</p>
        <p style={{ color: '#6B7280', fontSize: '0.75rem', margin: 0 }}>{description}</p>
      </div>
    </div>

    {done ? (
      <span style={{
        flexShrink: 0,
        padding: '0.3rem 0.65rem', borderRadius: '999px',
        background: 'rgba(52,211,153,0.1)', color: '#34D399',
        fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap',
      }}>
        ✓ {doneLabel}
      </span>
    ) : (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{
          flexShrink: 0,
          padding: '0.35rem 0.75rem',
          borderRadius: '0.4rem',
          border: `1px solid ${buttonColor}50`,
          background: `${buttonColor}10`,
          color: buttonColor,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '0.78rem', fontWeight: 600,
          whiteSpace: 'nowrap',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {buttonLabel}
      </button>
    )}
  </div>
);

export function GdprActionsPanel({ gdpr, dataId, onErasure, onPortability, onToggleProcessing, saving }) {
  if (!gdpr && gdpr !== null) return null;

  const restricted = gdpr?.processingRestricted ?? false;
  const erasureRequested = gdpr?.erasureRequested ?? false;
  const portabilityRequested = gdpr?.portabilityRequested ?? false;

  return (
    <div style={{
      borderRadius: '0.75rem',
      border: '1px solid rgba(6,182,212,0.2)',
      background: 'rgba(6,182,212,0.04)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid rgba(6,182,212,0.15)',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        <span>🇪🇺</span>
        <h4 style={{ color: '#67E8F9', fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>
          GDPR Rights (Article 17 / 20 / 18)
        </h4>
      </div>

      <div style={{ padding: '0.25rem 1rem 0.5rem' }}>
        <ActionRow
          icon="🗑"
          title="Right to Erasure (Art. 17)"
          description="Request deletion of all processing records for this dataset."
          buttonLabel="Request Erasure"
          buttonColor="#EF4444"
          onClick={() => onErasure(dataId)}
          disabled={saving || erasureRequested}
          done={erasureRequested}
          doneLabel="Requested"
        />
        <ActionRow
          icon="📤"
          title="Data Portability (Art. 20)"
          description="Request a machine-readable export of your consent and usage records."
          buttonLabel="Request Export"
          buttonColor="#F59E0B"
          onClick={() => onPortability(dataId)}
          disabled={saving || portabilityRequested}
          done={portabilityRequested}
          doneLabel="Requested"
        />
        <div style={{ borderBottom: 'none' }}>
          <ActionRow
            icon={restricted ? '▶️' : '⏸'}
            title={restricted ? 'Restore Processing (Art. 18)' : 'Restrict Processing (Art. 18)'}
            description={restricted
              ? 'Allow data processing to resume for this dataset.'
              : 'Temporarily halt all processing activities for this dataset.'}
            buttonLabel={restricted ? 'Restore Processing' : 'Restrict Processing'}
            buttonColor={restricted ? '#34D399' : '#8B5CF6'}
            onClick={() => onToggleProcessing(dataId, restricted)}
            disabled={saving}
            done={false}
          />
        </div>
      </div>

      {restricted && (
        <div style={{
          margin: '0 1rem 0.75rem',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <p style={{ color: '#FCA5A5', fontSize: '0.75rem', margin: 0 }}>
            ⚠ Processing is currently restricted. Researchers cannot access this dataset.
          </p>
        </div>
      )}
    </div>
  );
}
