/**
 * @file WalletSelector — account-switching and provider-selection UI
 * @module components/WalletSelector
 *
 * Renders a dropdown of all registered wallet accounts and allows the user
 * to switch the active account, connect a Ledger hardware wallet, add a
 * watch-only (imported) account, or connect a fresh software wallet via
 * the Stacks Connect 8.x flow.
 *
 * Consumes WalletContext so it must be rendered inside <WalletProvider>.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useWalletContext } from '../contexts/WalletContext';
import { isStacksAddress } from '../lib/validations';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Truncate a Stacks address for display: SP1ABC…XYZ9 */
const truncateAddress = (address, head = 6, tail = 4) => {
  if (!address || address.length <= head + tail + 3) return address || '';
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
};

/** Deterministic background colour from an address string */
const addressColor = (address) => {
  if (!address) return '#6b7280';
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 45%)`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * Visual badge/chip representing a single account entry.
 */
const AccountChip = ({ account, isActive, isFocused, onClick }) => {
  const bg = addressColor(account.address);
  return (
    <button
      type="button"
      role="option"
      aria-selected={isActive}
      aria-current={isFocused ? 'true' : undefined}
      onClick={onClick}
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            '10px',
        width:          '100%',
        padding:        '10px 14px',
        background:     isActive ? 'rgba(99,102,241,0.12)' : isFocused ? 'rgba(99,102,241,0.06)' : 'transparent',
        border:         'none',
        borderRadius:   '8px',
        cursor:         'pointer',
        textAlign:      'left',
        transition:     'background 0.15s',
      }}
    >
      {/* Avatar */}
      <span
        aria-hidden="true"
        style={{
          width:        '32px',
          height:       '32px',
          borderRadius: '50%',
          background:   bg,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          color:        '#fff',
          fontWeight:   700,
          fontSize:     '13px',
          flexShrink:   0,
        }}
      >
        {(account.label || 'A').charAt(0).toUpperCase()}
      </span>

      {/* Text */}
      <span style={{ flex: 1, overflow: 'hidden' }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: '14px', lineHeight: 1.3 }}>
          {account.label || 'Unnamed'}
        </span>
        <span style={{ display: 'block', fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace' }}>
          {truncateAddress(account.address)}
        </span>
        {account.source === 'ledger' && (
          <span style={{ display: 'inline-block', fontSize: '10px', background: '#0f172a', color: '#60a5fa', borderRadius: '4px', padding: '1px 5px', marginTop: '2px' }}>
            Ledger
          </span>
        )}
      </span>

      {/* Active indicator */}
      {isActive && (
        <span aria-label="Active account" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
      )}
    </button>
  );
};

AccountChip.propTypes = {
  account:  PropTypes.shape({
    address: PropTypes.string.isRequired,
    label:   PropTypes.string,
    source:  PropTypes.string,
  }).isRequired,
  isActive: PropTypes.bool,
  isFocused: PropTypes.bool,
  onClick:  PropTypes.func.isRequired,
};

// ── Main component ────────────────────────────────────────────────────────────

/**
 * WalletSelector dropdown.
 *
 * @param {Object}   props
 * @param {string}   [props.className]  - Additional CSS class names
 * @param {Function} [props.onSwitch]   - Called with the new address after switching
 */
const WalletSelector = ({ className = '', onSwitch }) => {
  const {
    address,
    isConnected,
    isLoading,
    accounts,
    activeIndex,
    switchAccount,
    addAccount,
    connectLedger,
    isLedgerConnected,
    connect,
    disconnect,
  } = useWalletContext();

  const [announcement, setAnnouncement] = useState('');

  // Announce account switches to screen readers
  useEffect(() => {
    if (accounts[activeIndex]) {
      setAnnouncement(`Switched to account ${accounts[activeIndex].label || truncateAddress(accounts[activeIndex].address)}`);
    }
  }, [activeIndex, accounts]);

  const [focusedIndex, setFocusedIndex] = useState(0);

  // Keyboard navigation for the dropdown
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusedIndex(prev => (prev + 1) % accounts.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusedIndex(prev => (prev - 1 + accounts.length) % accounts.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        handleSwitch(focusedIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, accounts.length, focusedIndex, handleSwitch]);


  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleSwitch = useCallback((index) => {
    switchAccount(index);
    setOpen(false);
    onSwitch?.(accounts[index]?.address);
  }, [switchAccount, accounts, onSwitch]);

  const handleImport = useCallback(() => {
    setImportError('');
    const trimmed = importAddress.trim();
    if (!trimmed) {
      setImportError('Address is required');
      return;
    }

    if (!isStacksAddress(trimmed)) {
      setImportError('Enter a valid Stacks address');
      return;
    }

    try {
      addAccount(trimmed, importLabel.trim() || 'Imported Account', 'testnet', 'imported');
      setImportAddress('');
      setImportLabel('');
      setAddMode(false);
    } catch (err) {
      setImportError(err.message);
    }
  }, [importAddress, importLabel, addAccount]);

  const handleConnectLedger = useCallback(async () => {
    setLedgerError('');
    setLedgerLoading(true);
    try {
      const addr = await connectLedger({ network: 'testnet' });
      setOpen(false);
      onSwitch?.(addr);
    } catch (err) {
      setLedgerError(err.message);
    } finally {
      setLedgerLoading(false);
    }
  }, [connectLedger, onSwitch]);

  if (!isConnected) {
    return (
      <button
        type="button"
        onClick={() => connect()}
        disabled={isLoading}
        className={className}
        style={{
          padding:      '8px 18px',
          borderRadius: '8px',
          background:   '#6366f1',
          color:        '#fff',
          border:       'none',
          cursor:       isLoading ? 'wait' : 'pointer',
          fontWeight:   600,
          fontSize:     '14px',
        }}
      >
        {isLoading ? 'Connecting…' : 'Connect Wallet'}
      </button>
    );
  }

  return (
    <div ref={panelRef} className={className} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
        {announcement}
      </div>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '8px',
          padding:      '8px 14px',
          borderRadius: '10px',
          background:   '#1f2937',
          border:       '1px solid #374151',
          color:        '#f9fafb',
          cursor:       'pointer',
          fontSize:     '14px',
          fontWeight:   500,
          minWidth:     '160px',
        }}
      >
        <span
          style={{
            width:        '24px',
            height:       '24px',
            borderRadius: '50%',
            background:   addressColor(address),
            flexShrink:   0,
          }}
          aria-hidden="true"
        />
        <span style={{ flex: 1, fontFamily: 'monospace' }}>{truncateAddress(address)}</span>
        <span aria-hidden="true" style={{ fontSize: '10px' }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Select wallet account"
          style={{
            position:     'absolute',
            top:          'calc(100% + 6px)',
            right:        0,
            minWidth:     '280px',
            background:   '#111827',
            border:       '1px solid #374151',
            borderRadius: '12px',
            boxShadow:    '0 10px 30px rgba(0,0,0,0.4)',
            zIndex:       1000,
            overflow:     'hidden',
          }}
        >
          {/* Account list */}
          <div style={{ padding: '8px' }}>
            <p style={{ padding: '6px 14px', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Accounts
            </p>
            {accounts.map((acc, idx) => (
              <AccountChip
                key={acc.address}
                account={acc}
                isActive={idx === activeIndex}
                isFocused={idx === focusedIndex}
                onClick={() => handleSwitch(idx)}
              />
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #1f2937', margin: '4px 0' }} />

          {/* Add account / Ledger */}
          <div style={{ padding: '8px' }}>
            {!addMode ? (
              <>
                <button
                  type="button"
                  onClick={() => setAddMode(true)}
                  style={actionBtnStyle}
                >
                  + Import Address
                </button>

                {!isLedgerConnected && (
                  <button
                    type="button"
                    onClick={handleConnectLedger}
                    disabled={ledgerLoading}
                    style={actionBtnStyle}
                  >
                    {ledgerLoading ? 'Connecting Ledger…' : '🔑 Connect Ledger'}
                  </button>
                )}

                {ledgerError && (
                  <p style={{ fontSize: '12px', color: '#f87171', padding: '4px 14px', margin: 0 }}>
                    {ledgerError}
                  </p>
                )}
              </>
            ) : (
              <div style={{ padding: '8px 6px' }}>
                <input
                  type="text"
                  placeholder="Stacks address"
                  value={importAddress}
                  onChange={e => setImportAddress(e.target.value)}
                  aria-describedby={importError ? 'import-error' : undefined}
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Label (optional)"
                  value={importLabel}
                  onChange={e => setImportLabel(e.target.value)}
                  style={{ ...inputStyle, marginTop: '6px' }}
                />
                {importError && <p id="import-error" style={{ fontSize: '12px', color: '#f87171', margin: '4px 0 0' }}>{importError}</p>}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button type="button" onClick={handleImport} style={{ ...actionBtnStyle, flex: 1, background: '#6366f1', color: '#fff' }}>
                    Import
                  </button>
                  <button type="button" onClick={() => { setAddMode(false); setImportError(''); }} style={{ ...actionBtnStyle, flex: 1 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #1f2937', margin: '4px 0' }} />

          {/* Disconnect */}
          <div style={{ padding: '8px' }}>
            <button
              type="button"
              onClick={() => { disconnect(); setOpen(false); }}
              style={{ ...actionBtnStyle, color: '#f87171' }}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Shared style snippets
const actionBtnStyle = {
  display:      'block',
  width:        '100%',
  padding:      '9px 14px',
  background:   'transparent',
  border:       'none',
  borderRadius: '8px',
  cursor:       'pointer',
  textAlign:    'left',
  fontSize:     '14px',
  color:        '#d1d5db',
  transition:   'background 0.15s',
};

const inputStyle = {
  width:        '100%',
  padding:      '8px 10px',
  background:   '#1f2937',
  border:       '1px solid #374151',
  borderRadius: '6px',
  color:        '#f9fafb',
  fontSize:     '13px',
  outline:      'none',
  boxSizing:    'border-box',
};

WalletSelector.propTypes = {
  className: PropTypes.string,
  onSwitch:  PropTypes.func,
};

export default WalletSelector;
