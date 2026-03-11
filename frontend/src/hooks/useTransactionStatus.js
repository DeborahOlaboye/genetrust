/**
 * @file useTransactionStatus — Nakamoto-aware transaction status hook
 * @module hooks/useTransactionStatus
 * @description Tracks Stacks transaction status using Nakamoto sub-second block
 * times. Provides optimistic UI updates, fast-finality classification, and
 * micro-fork detection for genetic data trades.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { walletService, NAKAMOTO, TX_STATUS } from '../services/walletService';

// ── Status shape ─────────────────────────────────────────────────────────────
/**
 * @typedef {Object} TxStatusState
 * @property {string}  txId            - Transaction ID being tracked
 * @property {string}  status          - One of TX_STATUS values
 * @property {number}  confirmations   - Number of block confirmations
 * @property {string}  finality        - 'unconfirmed'|'optimistic'|'fast'|'safe'
 * @property {boolean} isLoading       - True while initial fetch is in progress
 * @property {boolean} isOptimistic    - True when showing speculative UI state
 * @property {boolean} reorgDetected   - True if a micro-fork was detected
 * @property {string|null} blockHash   - Block hash at first confirmation
 * @property {string|null} error       - Error message or null
 * @property {number}  elapsed         - Milliseconds since broadcast
 */

const INITIAL_STATE = {
  txId:          null,
  status:        TX_STATUS.PENDING,
  confirmations: 0,
  finality:      'unconfirmed',
  isLoading:     false,
  isOptimistic:  false,
  reorgDetected: false,
  blockHash:     null,
  error:         null,
  elapsed:       0,
};

/**
 * useTransactionStatus
 *
 * Tracks a Stacks transaction through the Nakamoto fast-finality pipeline.
 *
 * @param {string|null}  txId      - Transaction ID to track (null = inactive)
 * @param {Object}       [options]
 * @param {boolean}      [options.optimistic=true]  - Show optimistic UI state
 * @param {Function}     [options.onConfirmed]      - Called on first confirmation
 * @param {Function}     [options.onFastFinality]   - Called at FAST_CONFIRMS
 * @param {Function}     [options.onSafeFinality]   - Called at SAFE_CONFIRMS
 * @param {Function}     [options.onReorg]          - Called when reorg detected
 * @param {Function}     [options.onFailed]         - Called on failure/drop
 * @returns {TxStatusState}
 */
export function useTransactionStatus(txId, options = {}) {
  const {
    optimistic     = true,
    onConfirmed,
    onFastFinality,
    onSafeFinality,
    onReorg,
    onFailed,
  } = options;

  const [state, setState] = useState({ ...INITIAL_STATE, txId });
  const pollRef    = useRef(null);
  const startRef   = useRef(null);
  const blockHash  = useRef(null);
  const firedRef   = useRef({ confirmed: false, fast: false, safe: false });

  // ── Elapsed time ticker ───────────────────────────────────────────────────
  const elapsedRef = useRef(null);

  const startElapsed = useCallback(() => {
    startRef.current = Date.now();
    const tick = () => {
      setPartial({ elapsed: Date.now() - (startRef.current ?? Date.now()) });
      elapsedRef.current = requestAnimationFrame(tick);
    };
    elapsedRef.current = requestAnimationFrame(tick);
  }, [setPartial]);

  const stopElapsed = useCallback(() => {
    if (elapsedRef.current) {
      cancelAnimationFrame(elapsedRef.current);
      elapsedRef.current = null;
    }
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const setPartial = useCallback((patch) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  // Stop timers on unmount
  useEffect(() => {
    return () => {
      clearPoll();
      stopElapsed();
    };
  }, [clearPoll, stopElapsed]);

  return { ...state, clearPoll, startElapsed, stopElapsed };
}

export default useTransactionStatus;
