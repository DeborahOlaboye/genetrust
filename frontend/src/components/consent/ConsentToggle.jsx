/**
 * ConsentToggle — a labelled on/off toggle for a single consent type.
 * Used for research, commercial, and clinical consent switches.
 */

import React from 'react';

export function ConsentToggle({ label, description, color = '#8B5CF6', checked, onChange, disabled = false }) {
  const id = `consent-toggle-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: '1rem',
      padding: '0.875rem 1rem',
      borderRadius: '0.75rem',
      background: checked ? `${color}0D` : 'rgba(11,11,29,0.6)',
      border: `1px solid ${checked ? color + '30' : 'rgba(55,65,81,0.5)'}`,
      transition: 'all 0.2s',
      opacity: disabled ? 0.5 : 1,
    }}>
      <div style={{ flex: 1 }}>
        <label
          htmlFor={id}
          style={{
            display: 'block',
            color: checked ? '#E5E7EB' : '#9AA0B2',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {label}
        </label>
        <p style={{ color: '#6B7280', fontSize: '0.75rem', margin: '0.15rem 0 0' }}>
          {description}
        </p>
      </div>

      {/* Toggle switch */}
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={`${label} consent`}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        style={{
          flexShrink: 0,
          width: '40px', height: '22px',
          borderRadius: '999px',
          border: 'none',
          background: checked ? color : '#374151',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'background 0.2s',
          padding: 0,
        }}
      >
        <span style={{
          position: 'absolute',
          top: '3px',
          left: checked ? '21px' : '3px',
          width: '16px', height: '16px',
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}
