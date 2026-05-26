/**
 * usePageDatasets — fetches the current user's datasets and manages
 * selected dataset state for the ConsentPage.
 *
 * Keeps loadDatasets referentially stable so the mount effect runs
 * exactly once. The initial auto-selection is handled by a separate
 * effect that only fires when datasets change without a selection.
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
      setDatasets(ds ?? []);
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
    setLoadError(null);
    setLoading(true);
    try {
      await loadDatasets();
    } catch {
      // loadDatasets already sets loadError internally
    }
  }, [loadDatasets]);

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
