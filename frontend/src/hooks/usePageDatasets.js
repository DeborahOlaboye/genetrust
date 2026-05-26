/**
 * usePageDatasets — fetches the current user's datasets and manages
 * selected dataset state for the ConsentPage.
 *
 * Design notes:
 * 1. loadDatasets has no external dependencies so its reference is stable.
 *    The mount effect ([loadDatasets]) therefore fires exactly once.
 *    Previously selectedId was a dep of loadDatasets, which caused a second
 *    fetch whenever the first load set the initial selectedId.
 *
 * 2. Auto-selection lives in its own effect ([datasets, selectedId]) so a
 *    refresh or retry does not reset a selection the user has already made.
 *
 * @returns {{
 *   datasets: Array,
 *   selectedId: number|null,
 *   selectedDataset: object|null,
 *   loading: boolean,
 *   loadError: string|null,
 *   walletConnected: boolean,
 *   status: object|null,
 *   isRefreshing: boolean,
 *   isBusy: boolean,
 *   handleDatasetChange: function,
 *   handleRefresh: function,
 *   handleConnectWallet: function,
 *   handleRetry: function,
 *   setSelectedId: function
 * }}
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { contractService } from '../services/contractService.js';
import { walletService } from '../services/walletService.js';
import { APP_CONFIG } from '../config/app.js';

export function usePageDatasets() {
  const [datasets, setDatasets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [status, setStatus] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stable fetch function — no external deps so it is only created once.
  const loadDatasets = useCallback(async () => {
    try {
      const isConnected = APP_CONFIG.USE_REAL_SDK ? await walletService.isConnected() : true;
      setWalletConnected(isConnected);
      await contractService.initialize({ walletAddress: walletService.getAddress() });
      const s = await contractService.getStatus();
      setStatus(s);
      const ds = await contractService.listMyDatasets();
      setDatasets(Array.isArray(ds) ? ds : []);
      setLoadError(null);
    } catch (err) {
      setLoadError(err?.message || 'Failed to load datasets');
    } finally {
      setLoading(false);
    }
  }, []);

  // Mount-only fetch
  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  // Auto-select first dataset when datasets load and none is selected yet.
  useEffect(() => {
    if (datasets.length > 0 && selectedId === null) {
      setSelectedId(datasets[0].id);
    }
  }, [datasets, selectedId]);

  const isBusy = loading || isRefreshing;

  const selectedDataset = useMemo(
    () => datasets.find(d => d.id === selectedId) ?? null,
    [datasets, selectedId]
  );

  const handleDatasetChange = useCallback((e) => {
    setSelectedId(Number(e.target.value));
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setLoadError(null);
    setIsRefreshing(true);
    try {
      await loadDatasets();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, loadDatasets]);

  const handleConnectWallet = useCallback(async () => {
    try {
      await walletService.connect();
      setWalletConnected(true);
      await loadDatasets();
    } catch (err) {
      setLoadError(err?.message || 'Failed to connect wallet');
    }
  }, [loadDatasets]);

  const handleRetry = useCallback(async () => {
    if (loading || isRefreshing) return;
    setLoadError(null);
    setLoading(true);
    try {
      await loadDatasets();
    } catch {
      // loadDatasets already sets loadError internally
    }
  }, [isRefreshing, loading, loadDatasets]);

  return {
    datasets,
    selectedId,
    selectedDataset,
    loading,
    loadError,
    walletConnected,
    status,
    isRefreshing,
    isBusy,
    handleDatasetChange,
    handleRefresh,
    handleConnectWallet,
    handleRetry,
    setSelectedId,
  };
}
