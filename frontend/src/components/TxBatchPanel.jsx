/**
 * @file TxBatchPanel — transaction batch queue inspector and executor
 * @module components/TxBatchPanel
 *
 * Renders the current transaction batch queue, shows each entry's status,
 * and provides controls to remove individual transactions, clear the entire
 * queue, or flush (execute) all pending transactions in order.
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useWalletContext } from '../contexts/WalletContext';

// ── Status badge styles ───────────────────────────────────────────────────────

const STATUS_STYLES = {
  pending:   { background: '#1e3a5f', color: '#93c5fd' },
  signed:    { background: '#1c3829', color: '#86efac' },
  broadcast: { background: '#1c2e4a', color: '#67e8f9' },
  confirmed: { background: '#14532d', color: '#4ade80' },
  failed:    { background: '#450a0a', color: '#fca5a5' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span style={{
      ...s,
      padding:      '2px 8px',
      borderRadius: '999px',
      fontSize:     '11px',
      fontWeight:   600,
      textTransform:'capitalize',
    }}>
      {status}
    </span>
  );
};

StatusBadge.propTypes = { status: PropTypes.string.isRequired };

// ── Main component ────────────────────────────────────────────────────────────

/**
 * TxBatchPanel
 *
 * @param {Object}   props
 * @param {Function} [props.onFlushComplete] - Called with results array after flush
 * @param {string}   [props.className]
 */
const TxBatchPanel = ({ onFlushComplete, className = '' }) => {
  const {
    txQueue,
    txQueueLength,
    isBatchProcessing,
    batchResults,
    dequeueTx,
    clearTxQueue,
    flushTxQueue,
    isConnected,
  } = useWalletContext();

  const handleFlush = useCallback(async () => {
    try {
      const results = await flushTxQueue();
      onFlushComplete?.(results);
    } catch {
      // Error is available in context
    }
  }, [flushTxQueue, onFlushComplete]);

  if (!isConnected) return null;

  return (
    <div
      className={className}
      style={{
        background:   '#111827',
        border:       '1px solid #1f2937',
        borderRadius: '12px',
        overflow:     'hidden',
        fontSize:     '14px',
      }}
    >
      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '14px 18px',
        borderBottom:   '1px solid #1f2937',
      }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f9fafb' }}>
          Transaction Queue
          {txQueueLength > 0 && (
            <span style={{
              marginLeft:   '8px',
              background:   '#6366f1',
              color:        '#fff',
              borderRadius: '999px',
              padding:      '1px 8px',
              fontSize:     '12px',
            }}>
              {txQueueLength}
            </span>
          )}
        </h3>

        <div style={{ display: 'flex', gap: '8px' }}>
          {txQueueLength > 0 && (
            <>
              <button
                type="button"
                onClick={clearTxQueue}
                disabled={isBatchProcessing}
                style={headerBtnStyle('#374151', '#9ca3af')}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleFlush}
                disabled={isBatchProcessing || txQueueLength === 0}
                style={headerBtnStyle('#6366f1', '#fff')}
              >
                {isBatchProcessing ? 'Processing…' : `Submit ${txQueueLength} Tx${txQueueLength !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Empty state */}
      {txQueueLength === 0 && batchResults.length === 0 && (
        <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
          No transactions queued
        </div>
      )}

      {/* Queue items */}
      {txQueue.map((tx, idx) => (
        <TxRow
          key={tx.id}
          tx={tx}
          index={idx}
          onRemove={() => dequeueTx(tx.id)}
          disabled={isBatchProcessing}
        />
      ))}

      {/* Results */}
      {batchResults.length > 0 && txQueueLength === 0 && (
        <>
          <div style={{ padding: '8px 18px', fontSize: '12px', color: '#6b7280', background: '#0f172a' }}>
            Last batch results
          </div>
          {batchResults.map((tx, idx) => (
            <TxRow key={tx.id || idx} tx={tx} index={idx} readOnly />
          ))}
        </>
      )}
    </div>
  );
};

// ── Row sub-component ─────────────────────────────────────────────────────────

const TxRow = ({ tx, index, onRemove, disabled, readOnly }) => (
  <div style={{
    display:        'flex',
    alignItems:     'center',
    gap:            '12px',
    padding:        '12px 18px',
    borderBottom:   '1px solid #0f172a',
  }}>
    {/* Index */}
    <span style={{ color: '#4b5563', fontSize: '12px', width: '20px', flexShrink: 0 }}>
      #{index + 1}
    </span>

    {/* Contract call info */}
    <span style={{ flex: 1, overflow: 'hidden' }}>
      <span style={{ display: 'block', fontWeight: 600, color: '#f9fafb', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {tx.contractName}.{tx.functionName}
      </span>
      <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {tx.contractAddress}
      </span>
      {tx.error && (
        <span style={{ display: 'block', fontSize: '11px', color: '#f87171', marginTop: '2px' }}>
          {tx.error}
        </span>
      )}
    </span>

    <StatusBadge status={tx.status} />

    {!readOnly && (
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove transaction ${index + 1}`}
        style={{
          background: 'none',
          border:     'none',
          color:      '#6b7280',
          cursor:     disabled ? 'not-allowed' : 'pointer',
          fontSize:   '18px',
          lineHeight: 1,
          padding:    '2px 4px',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    )}
  </div>
);

TxRow.propTypes = {
  tx:       PropTypes.object.isRequired,
  index:    PropTypes.number.isRequired,
  onRemove: PropTypes.func,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
};

const headerBtnStyle = (bg, color) => ({
  padding:      '6px 14px',
  borderRadius: '8px',
  background:   bg,
  color,
  border:       'none',
  cursor:       'pointer',
  fontWeight:   600,
  fontSize:     '13px',
});

TxBatchPanel.propTypes = {
  onFlushComplete: PropTypes.func,
  className:       PropTypes.string,
};

export default TxBatchPanel;
