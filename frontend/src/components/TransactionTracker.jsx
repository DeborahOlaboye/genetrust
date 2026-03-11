/**
 * @file TransactionTracker — Nakamoto fast-finality transaction status UI
 * @module components/TransactionTracker
 * @description Displays real-time transaction progress using Nakamoto sub-second
 * block times. Shows optimistic state, confirmation depth, finality level, and
 * block reorg alerts for genetic data trades.
 */

import { useCallback } from 'react';
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

export default TransactionTracker;
