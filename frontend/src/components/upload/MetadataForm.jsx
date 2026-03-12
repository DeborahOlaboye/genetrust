/**
 * MetadataForm — step 2 of the upload wizard
 * User sets price, access level, optional IPFS URL, and description.
 */

import React from 'react';
import { ACCESS_LEVELS } from '../../hooks/useDatasetUpload.js';

const inputStyle = {
  width: '100%',
  background: 'rgba(11,11,29,0.8)',
  border: '1px solid rgba(139,92,246,0.3)',
  borderRadius: '0.5rem',
  padding: '0.6rem 0.75rem',
  color: '#E5E7EB',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  color: '#9AA0B2',
  fontSize: '0.82rem',
  marginBottom: '0.35rem',
  fontWeight: 500,
};

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '0.25rem' };

export function MetadataForm({ state, setField, onBack, onSubmit, submitting = false }) {
  const { price, accessLevel, storageUrl, description, error, fileName, fileSize } = state;

  const formatBytes = (b) => {
    if (b === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Selected file summary */}
      <div style={{
        padding: '0.75rem 1rem',
        borderRadius: '0.75rem',
        background: 'rgba(52,211,153,0.06)',
        border: '1px solid rgba(52,211,153,0.15)',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="#34D399" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
        <div>
          <p style={{ color: '#E5E7EB', fontWeight: 500, margin: 0, fontSize: '0.875rem' }}>{fileName}</p>
          <p style={{ color: '#6B7280', fontSize: '0.75rem', margin: 0 }}>{formatBytes(fileSize)}</p>
        </div>
      </div>

      {/* Price */}
      <div style={fieldStyle}>
        <label htmlFor="upload-price" style={labelStyle}>
          Price (STX) <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          id="upload-price"
          type="number"
          min="1"
          value={price}
          onChange={e => setField('price', e.target.value)}
          placeholder="e.g. 100"
          style={inputStyle}
        />
        <span style={{ color: '#4B5563', fontSize: '0.75rem' }}>
          Amount researchers will pay for access (in STX)
        </span>
      </div>

      {/* Access Level */}
      <div style={fieldStyle}>
        <span style={labelStyle}>Access Level <span style={{ color: '#EF4444' }}>*</span></span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {ACCESS_LEVELS.map(({ value, label, description: desc }) => {
            const active = accessLevel === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setField('accessLevel', value)}
                style={{
                  flex: 1,
                  minWidth: '7rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: active ? '1px solid #8B5CF6' : '1px solid rgba(139,92,246,0.2)',
                  background: active ? 'rgba(139,92,246,0.15)' : 'rgba(11,11,29,0.6)',
                  color: active ? '#E5E7EB' : '#9AA0B2',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{label}</div>
                <div style={{ fontSize: '0.72rem', color: active ? '#A78BFA' : '#4B5563', marginTop: '0.1rem' }}>{desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* IPFS / Storage URL */}
      <div style={fieldStyle}>
        <label htmlFor="upload-url" style={labelStyle}>Storage URL (optional)</label>
        <input
          id="upload-url"
          type="text"
          value={storageUrl}
          onChange={e => setField('storageUrl', e.target.value)}
          placeholder="ipfs://Qm... or https://..."
          style={inputStyle}
        />
        <span style={{ color: '#4B5563', fontSize: '0.75rem' }}>
          Leave blank to auto-generate an IPFS placeholder URI
        </span>
      </div>

      {/* Description */}
      <div style={fieldStyle}>
        <label htmlFor="upload-desc" style={labelStyle}>
          Description <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <textarea
          id="upload-desc"
          value={description}
          onChange={e => setField('description', e.target.value)}
          placeholder="Describe the dataset: population, sequencing method, traits studied…"
          maxLength={200}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        <span style={{ color: '#4B5563', fontSize: '0.75rem', textAlign: 'right' }}>
          {description.length}/200
        </span>
      </div>

      {/* Error */}
      {error && (
        <p role="alert" style={{ color: '#EF4444', fontSize: '0.85rem', margin: 0 }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            flex: 1,
            padding: '0.7rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(139,92,246,0.3)',
            background: 'transparent',
            color: '#9AA0B2',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          style={{
            flex: 2,
            padding: '0.7rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: submitting ? 'rgba(139,92,246,0.4)' : 'linear-gradient(135deg,#8B5CF6,#6D28D9)',
            color: '#fff',
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          {submitting ? 'Computing hash…' : 'Register Dataset →'}
        </button>
      </div>
    </div>
  );
}
