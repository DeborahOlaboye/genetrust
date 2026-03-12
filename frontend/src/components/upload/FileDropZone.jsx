/**
 * FileDropZone — drag-and-drop or click-to-select file input
 * Accepts genomic file formats: VCF, FASTQ, BAM, CSV, TXT, GZ
 */

import React, { useCallback, useRef, useState } from 'react';

const ACCEPTED_EXTENSIONS = '.vcf,.vcf.gz,.fastq,.fastq.gz,.bam,.csv,.txt,.gz';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export function FileDropZone({ onFile, fileError, disabled = false }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }, [onFile, disabled]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const handleChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    // reset so the same file can be re-selected after error
    e.target.value = '';
  }, [onFile]);

  const accentColor = fileError ? '#EF4444' : dragging ? '#8B5CF6' : '#374151';

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Click or drag to upload genomic file"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${accentColor}`,
          borderRadius: '1rem',
          padding: '3rem 2rem',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: dragging ? 'rgba(139,92,246,0.06)' : 'rgba(11,11,29,0.6)',
          transition: 'border-color 0.2s, background 0.2s',
          outline: 'none',
        }}
      >
        {/* Icon */}
        <svg
          width="48" height="48"
          viewBox="0 0 24 24" fill="none"
          stroke={dragging ? '#8B5CF6' : '#6B7280'}
          strokeWidth="1.5"
          style={{ margin: '0 auto 1rem' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
        </svg>

        <p style={{ color: '#E5E7EB', marginBottom: '0.25rem', fontWeight: 500 }}>
          {dragging ? 'Drop to upload' : 'Drag & drop your genomic file here'}
        </p>
        <p style={{ color: '#6B7280', fontSize: '0.85rem' }}>
          or <span style={{ color: '#8B5CF6' }}>click to browse</span>
        </p>
        <p style={{ color: '#4B5563', fontSize: '0.75rem', marginTop: '0.75rem' }}>
          Accepted: VCF, FASTQ, BAM, CSV, TXT, GZ · Max 500 MB
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleChange}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
      </div>

      {fileError && (
        <p role="alert" style={{ color: '#EF4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          {fileError}
        </p>
      )}
    </div>
  );
}

export function FilePreview({ fileName, fileSize }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.75rem 1rem',
      borderRadius: '0.75rem',
      background: 'rgba(139,92,246,0.08)',
      border: '1px solid rgba(139,92,246,0.2)',
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="#8B5CF6" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#E5E7EB', fontWeight: 500, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fileName}
        </p>
        <p style={{ color: '#6B7280', fontSize: '0.75rem', margin: 0 }}>
          {formatBytes(fileSize)}
        </p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="#34D399" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    </div>
  );
}
