/**
 * @file useTxBatch — React hook for transaction batching
 * @module hooks/useTxBatch
 *
 * Wraps the walletService transaction queue API so React components can
 * queue, inspect, and flush batches of Stacks contract calls without
 * re-triggering unnecessary renders.
 */

import { useState, useEffect, useCallback } from 'react';
import { walletService, TX_STATUS } from '../services/walletService';

/**
 * @typedef {Object} TxEntry
 * @property {string} id             - Unique queue identifier
 * @property {string} contractAddress
 * @property {string} contractName
 * @property {string} functionName
 * @property {Array}  functionArgs
 * @property {string} status         - One of TX_STATUS values
 * @property {number} addedAt        - Timestamp
 * @property {Object|null} result    - Broadcast result, or null
 * @property {string|null} error     - Error message if failed, or null
 */

/**
 * Hook for building and flushing batches of Stacks contract calls.
 *
 * @returns {{
 *   queue: TxEntry[],
 *   queueLength: number,
 *   isProcessing: boolean,
 *   results: TxEntry[],
 *   error: string|null,
 *   enqueueTx: (txDescriptor: Object) => void,
 *   dequeueTx: (txId: string) => void,
 *   clearQueue: () => void,
 *   flushQueue: (onProgress?: Function) => Promise<TxEntry[]>,
 *   TX_STATUS: typeof TX_STATUS,
 * }}
 */
const useTxBatch = () => {
  const [queue,        setQueue]        = useState(() => walletService.getTxQueue());
  const [isProcessing, setIsProcessing] = useState(false);
  const [results,      setResults]      = useState([]);
  const [error,        setError]        = useState(null);

  // Keep local queue in sync after walletService emits
  useEffect(() => {
    const unsubscribe = walletService.addListener(() => {
      setQueue(walletService.getTxQueue());
    });
    return unsubscribe;
  }, []);

  const enqueueTx = useCallback((txDescriptor) => {
    try {
      setError(null);
      walletService.enqueueTx(txDescriptor);
      setQueue(walletService.getTxQueue());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const dequeueTx = useCallback((txId) => {
    try {
      setError(null);
      walletService.dequeueTx(txId);
      setQueue(walletService.getTxQueue());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const clearQueue = useCallback(() => {
    walletService.clearTxQueue();
    setQueue([]);
    setResults([]);
    setError(null);
  }, []);

  const flushQueue = useCallback(async (onProgress) => {
    setError(null);
    setIsProcessing(true);
    try {
      const txResults = await walletService.flushTxQueue(onProgress);
      setResults(txResults);
      setQueue(walletService.getTxQueue());
      return txResults;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    queue,
    queueLength:  queue.length,
    isProcessing,
    results,
    error,
    enqueueTx,
    dequeueTx,
    clearQueue,
    flushQueue,
    TX_STATUS,
  };
};

export default useTxBatch;
