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

  // ── Nakamoto polling loop ─────────────────────────────────────────────────

  const poll = useCallback(async () => {
    if (!txId) return;
    // eslint-disable-next-line no-use-before-define

    try {
      const txData = await walletService.fetchTxStatus(txId);
      const apiStatus = txData.tx_status;

      // Map Hiro API status to our TX_STATUS
      if (apiStatus === NAKAMOTO.API_STATUS.FAILED || apiStatus === NAKAMOTO.API_STATUS.DROPPED) {
        setPartial({ status: TX_STATUS.FAILED, isLoading: false, error: `Transaction ${apiStatus}` });
        clearPoll();
        stopElapsed();
        if (onFailed) onFailed(txData);
        return;
      }

      if (apiStatus === 'success') {
        const count = await walletService.getConfirmationCount(txId);
        const level = walletService.classifyFinality(count);

        // Store block hash for reorg detection, then start watcher
        if (!blockHash.current && txData.block_hash) {
          blockHash.current = txData.block_hash;
          startReorgWatch();
        }

        setPartial({
          status:        TX_STATUS.CONFIRMED,
          confirmations: count,
          finality:      level,
          blockHash:     blockHash.current,
          isLoading:     false,
          isOptimistic:  false,
        });

        // Fire callbacks exactly once per milestone
        if (count >= 1 && !firedRef.current.confirmed) {
          firedRef.current.confirmed = true;
          if (onConfirmed) onConfirmed({ txId, confirmations: count, txData });
        }
        if (count >= NAKAMOTO.FAST_CONFIRMS && !firedRef.current.fast) {
          firedRef.current.fast = true;
          if (onFastFinality) onFastFinality({ txId, confirmations: count });
        }
        if (count >= NAKAMOTO.SAFE_CONFIRMS && !firedRef.current.safe) {
          firedRef.current.safe = true;
          stopElapsed();
          clearPoll();
          if (onSafeFinality) onSafeFinality({ txId, confirmations: count });
          return;
        }

        // Continue slow polling until safe finality
        pollRef.current = setTimeout(poll, NAKAMOTO.SLOW_POLL_MS);
        return;
      }

      // Still pending — use fast Nakamoto interval
      if (optimistic) {
        setPartial({ isOptimistic: true, status: TX_STATUS.BROADCAST });
      }
      pollRef.current = setTimeout(poll, NAKAMOTO.FAST_POLL_MS);
    } catch (err) {
      // Transient network error — keep polling at normal rate
      pollRef.current = setTimeout(poll, NAKAMOTO.NORMAL_POLL_MS);
    }
  }, [txId, optimistic, clearPoll, stopElapsed, setPartial,
      onConfirmed, onFastFinality, onSafeFinality, onFailed]);

  // ── Micro-fork (block reorg) detection ───────────────────────────────────
  const reorgPollRef = useRef(null);

  const startReorgWatch = useCallback(() => {
    if (!txId || !blockHash.current) return;

    const checkReorg = async () => {
      const reorg = await walletService.detectMicroFork(txId, blockHash.current);
      if (reorg) {
        setPartial({
          reorgDetected: true,
          finality:      'unconfirmed',
          confirmations: 0,
          status:        TX_STATUS.BROADCAST,
        });
        if (onReorg) onReorg({ txId, blockHash: blockHash.current });
        // Reset blockHash so we track new inclusion block
        blockHash.current = null;
        firedRef.current  = { confirmed: false, fast: false, safe: false };
        // Resume fast polling
        pollRef.current = setTimeout(poll, NAKAMOTO.FAST_POLL_MS);
      }
      // Re-schedule reorg check until safe finality
      if (!firedRef.current.safe) {
        reorgPollRef.current = setTimeout(checkReorg, NAKAMOTO.NORMAL_POLL_MS * 2);
      }
    };

    reorgPollRef.current = setTimeout(checkReorg, NAKAMOTO.NORMAL_POLL_MS);
  }, [txId, poll, setPartial, onReorg]);

  // ── Start / reset on txId change ─────────────────────────────────────────
  useEffect(() => {
    if (!txId) {
      setState({ ...INITIAL_STATE, txId: null });
      clearPoll();
      stopElapsed();
      return;
    }

    // Reset state for new txId
    blockHash.current = null;
    firedRef.current  = { confirmed: false, fast: false, safe: false };
    setState({ ...INITIAL_STATE, txId, isLoading: true, status: TX_STATUS.BROADCAST });
    startElapsed();

    // Begin Nakamoto fast polling immediately
    pollRef.current = setTimeout(poll, NAKAMOTO.FAST_POLL_MS);

    return () => {
      clearPoll();
      stopElapsed();
    };
  }, [txId, poll, clearPoll, startElapsed, stopElapsed]);

  // Stop all timers on unmount
  useEffect(() => {
    return () => {
      clearPoll();
      stopElapsed();
      if (reorgPollRef.current) clearTimeout(reorgPollRef.current);
    };
  }, [clearPoll, stopElapsed]);

  return { ...state, clearPoll, startElapsed, stopElapsed };
}

export default useTransactionStatus;
