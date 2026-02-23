/**
 * @file WalletStatusIndicator — compact connection status badge
 * @module components/WalletStatusIndicator
 *
 * Renders a small visual badge showing:
 *   • Connection status (connected / disconnected)
 *   • Active provider (Reown, Hiro, Ledger, …)
 *   • Session validity warning when expiry is near
 *   • Pending batch transaction count
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useWalletContext } from '../contexts/WalletContext';

// ── Provider icon map ─────────────────────────────────────────────────────────

const PROVIDER_LABELS = {
  reown:  'Reown',
  hiro:   'Hiro',
  ledger: 'Ledger 🔑',
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * WalletStatusIndicator
 *
 * @param {Object}  props
 * @param {boolean} [props.showProvider=true]  - Display active provider name
 * @param {boolean} [props.showTxCount=true]   - Display pending tx count badge
 * @param {string}  [props.className]
 */
const WalletStatusIndicator = ({
  showProvider = true,
  showTxCount  = true,
  className    = '',
}) => {
  const {
    isConnected,
    provider,
    isLedgerConnected,
    isSessionValid,
    isExpiringSoon,
    txQueueLength,
  } = useWalletContext();

  const dot = isConnected
    ? isExpiringSoon
      ? '#facc15'  // yellow — expiring soon
      : '#22c55e'  // green  — healthy
    : '#ef4444';   // red    — disconnected

  const label = isLedgerConnected
    ? PROVIDER_LABELS.ledger
    : provider
      ? PROVIDER_LABELS[provider] || provider
      : null;

  return (
    <div
      className={className}
      style={{
        display:     'inline-flex',
        alignItems:  'center',
        gap:         '6px',
        padding:     '4px 10px',
        borderRadius:'999px',
        background:  '#1f2937',
        border:      '1px solid #374151',
        fontSize:    '12px',
        fontWeight:  500,
        color:       '#d1d5db',
        userSelect:  'none',
      }}
      aria-label={
        isConnected
          ? `Wallet connected${provider ? ` via ${label}` : ''}${isExpiringSoon ? ', session expiring soon' : ''}`
          : 'Wallet disconnected'
      }
    >
      {/* Status dot */}
      <span
        aria-hidden="true"
        style={{ width: '8px', height: '8px', borderRadius: '50%', background: dot, flexShrink: 0 }}
      />

      {/* Provider label */}
      {showProvider && isConnected && label && (
        <span>{label}</span>
      )}

      {!isConnected && <span>Not connected</span>}

      {/* Expiry warning */}
      {isConnected && isExpiringSoon && !showProvider && (
        <span style={{ color: '#facc15' }}>Session expiring</span>
      )}

      {/* Session invalid */}
      {isConnected && !isSessionValid && (
        <span style={{ color: '#f87171' }}>Session expired</span>
      )}

      {/* Pending tx badge */}
      {showTxCount && txQueueLength > 0 && (
        <span
          aria-label={`${txQueueLength} pending transaction${txQueueLength !== 1 ? 's' : ''}`}
          style={{
            background:   '#6366f1',
            color:        '#fff',
            borderRadius: '999px',
            padding:      '1px 6px',
            fontSize:     '11px',
            fontWeight:   700,
          }}
        >
          {txQueueLength} pending
        </span>
      )}
    </div>
  );
};

WalletStatusIndicator.propTypes = {
  showProvider: PropTypes.bool,
  showTxCount:  PropTypes.bool,
  className:    PropTypes.string,
};

export default WalletStatusIndicator;
