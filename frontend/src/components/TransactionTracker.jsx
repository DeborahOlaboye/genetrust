/**
 * @file TransactionTracker — Nakamoto fast-finality transaction status UI
 * @module components/TransactionTracker
 * @description Displays real-time transaction progress using Nakamoto sub-second
 * block times. Shows optimistic state, confirmation depth, finality level, and
 * block reorg alerts for genetic data trades.
 */

import PropTypes from 'prop-types';
import { useTransactionStatus } from '../hooks/useTransactionStatus';
import { NAKAMOTO } from '../services/walletService';

// ── Finality level metadata ───────────────────────────────────────────────────
const FINALITY_META = {
  unconfirmed: {
    label:  'Pending',
    color:  '#f59e0b',
    bg:     '#fef3c7',
    desc:   'Waiting for block inclusion',
  },
  optimistic: {
    label:  'Optimistic',
    color:  '#3b82f6',
    bg:     '#dbeafe',
    desc:   'Likely confirmed — awaiting more blocks',
  },
  fast: {
    label:  'Fast Finality',
    color:  '#10b981',
    bg:     '#d1fae5',
    desc:   `${NAKAMOTO.FAST_CONFIRMS} confirmations — Nakamoto fast-final`,
  },
  safe: {
    label:  'Safe',
    color:  '#059669',
    bg:     '#a7f3d0',
    desc:   `${NAKAMOTO.SAFE_CONFIRMS}+ confirmations — fully safe`,
  },
};

/**
 * TransactionTracker
 *
 * Renders a status card that tracks a Stacks transaction through the
 * Nakamoto fast-finality pipeline.
 *
 * @param {Object}   props
 * @param {string}   props.txId           - Transaction ID to track
 * @param {string}   [props.title]        - Optional label for the trade/action
 * @param {Function} [props.onConfirmed]  - Called on first confirmation
 * @param {Function} [props.onFastFinality]
 * @param {Function} [props.onSafeFinality]
 * @param {Function} [props.onReorg]
 * @param {Function} [props.onFailed]
 * @param {boolean}  [props.compact=false] - Use compact single-line layout
 */
// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * Renders a segmented progress bar showing confirmation depth toward safe finality.
 */
function ConfirmationBar({ confirmations, finality }) {
  const total  = NAKAMOTO.SAFE_CONFIRMS;
  const filled = Math.min(confirmations, total);
  const pct    = Math.round((filled / total) * 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={filled}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${filled} of ${total} confirmations`}
      style={{ width: '100%' }}
    >
      <div style={{
        display:        'flex',
        gap:            '3px',
        marginBottom:   '4px',
      }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              flex:         1,
              height:       '6px',
              borderRadius: '3px',
              background:   i < filled
                ? (FINALITY_META[finality]?.color ?? '#10b981')
                : '#e5e7eb',
              transition:   'background 0.3s ease',
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'right' }}>
        {filled}/{total} confirmations ({pct}%)
      </div>
    </div>
  );
}

/**
 * Simple CSS spinner for pending/loading states.
 */
function Spinner({ color = '#3b82f6', size = 16 }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display:         'inline-block',
        width:           size,
        height:          size,
        borderRadius:    '50%',
        border:          `2px solid ${color}33`,
        borderTopColor:  color,
        animation:       'spin 0.7s linear infinite',
      }}
    />
  );
}

// Inject keyframe once
if (typeof document !== 'undefined') {
  const id = 'nakamoto-spin-style';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
  }
}

/**
 * Small pill badge showing finality level.
 */
function FinalityBadge({ meta }) {
  return (
    <span
      aria-label={`Finality: ${meta.label}`}
      style={{
        background:   meta.color,
        color:        '#fff',
        borderRadius: '999px',
        padding:      '2px 10px',
        fontSize:     '12px',
        fontWeight:   600,
        letterSpacing:'0.02em',
      }}
    >
      {meta.label}
    </span>
  );
}

/**
 * Single-line compact variant for inline use (e.g. inside a trade row).
 */
function CompactView({ txId, shortId, status, meta }) {
  return (
    <div
      role="status"
      aria-label={`Transaction ${shortId}: ${meta.label}`}
      style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          '8px',
        background:   meta.bg,
        border:       `1px solid ${meta.color}`,
        borderRadius: '8px',
        padding:      '4px 10px',
        fontSize:     '12px',
        fontFamily:   'system-ui, sans-serif',
      }}
    >
      <FinalityBadge meta={meta} />
      <a
        href={`https://explorer.hiro.so/txid/${txId}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: meta.color, fontFamily: 'monospace' }}
      >
        {shortId}
      </a>
      <span style={{ color: '#6b7280' }}>
        {status.confirmations}/{NAKAMOTO.SAFE_CONFIRMS} conf
      </span>
      {status.reorgDetected && (
        <span role="alert" style={{ color: '#dc2626', fontWeight: 600 }}>⚠ Reorg</span>
      )}
    </div>
  );
}

/**
 * Full-size transaction status card.
 */
function FullView({ txId, shortId, title, status, meta }) {
  const elapsedSec  = Math.round(status.elapsed / 1000);
  const { refresh } = status;

  return (
    <div
      role="region"
      aria-label={`Transaction status for ${title}`}
      style={{
        background:   meta.bg,
        border:       `1px solid ${meta.color}`,
        borderRadius: '12px',
        padding:      '16px',
        maxWidth:     '480px',
        fontFamily:   'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {status.isLoading && <Spinner color={meta.color} />}
          {title}
        </span>
        <FinalityBadge meta={meta} />
      </div>

      {/* Reorg alert */}
      {status.reorgDetected && (
        <div role="alert" style={{
          background: '#fef2f2', border: '1px solid #ef4444',
          borderRadius: '8px', padding: '8px', marginBottom: '10px',
          fontSize: '13px', color: '#b91c1c',
        }}>
          Block reorganization detected — re-confirming transaction
        </div>
      )}

      {/* Optimistic note */}
      {status.isOptimistic && !status.reorgDetected && (
        <div style={{
          background: '#eff6ff', borderRadius: '8px', padding: '8px',
          marginBottom: '10px', fontSize: '13px', color: '#1d4ed8',
        }}>
          Optimistic: transaction likely included in the next block
        </div>
      )}

      {/* Tx ID */}
      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
        <span>TX: </span>
        <a
          href={`https://explorer.hiro.so/txid/${txId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: meta.color, fontFamily: 'monospace' }}
        >
          {shortId}
        </a>
      </div>

      {/* Confirmation progress */}
      <ConfirmationBar
        confirmations={status.confirmations}
        finality={status.finality}
      />

      {/* Elapsed */}
      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>
        {status.finality === 'safe'
          ? `Finalised in ${elapsedSec}s`
          : `Elapsed: ${elapsedSec}s`}
      </div>

      {/* Description */}
      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
        {meta.desc}
      </div>

      {/* Error */}
      {status.error && (
        <div role="alert" style={{ color: '#dc2626', fontSize: '13px', marginTop: '8px' }}>
          {status.error}
        </div>
      )}

      {/* Manual refresh */}
      {status.finality !== 'safe' && !status.error && (
        <button
          onClick={refresh}
          aria-label="Refresh transaction status"
          style={{
            marginTop:    '10px',
            background:   'transparent',
            border:       `1px solid ${meta.color}`,
            borderRadius: '6px',
            color:         meta.color,
            padding:       '4px 12px',
            fontSize:      '12px',
            cursor:        'pointer',
          }}
        >
          Refresh status
        </button>
      )}
    </div>
  );
}

export function TransactionTracker({
  txId,
  title = 'Transaction',
  onConfirmed,
  onFastFinality,
  onSafeFinality,
  onReorg,
  onFailed,
  compact = false,
}) {
  const status = useTransactionStatus(txId, {
    onConfirmed,
    onFastFinality,
    onSafeFinality,
    onReorg,
    onFailed,
  });

  if (!txId) return null;

  const meta    = FINALITY_META[status.finality] ?? FINALITY_META.unconfirmed;
  const shortId = txId.slice(0, 8) + '…' + txId.slice(-6);

  if (compact) {
    return <CompactView txId={txId} shortId={shortId} status={status} meta={meta} />;
  }

  return <FullView txId={txId} shortId={shortId} title={title} status={status} meta={meta} />;
}

TransactionTracker.propTypes = {
  txId:           PropTypes.string.isRequired,
  title:          PropTypes.string,
  onConfirmed:    PropTypes.func,
  onFastFinality: PropTypes.func,
  onSafeFinality: PropTypes.func,
  onReorg:        PropTypes.func,
  onFailed:       PropTypes.func,
  compact:        PropTypes.bool,
};

export default TransactionTracker;
