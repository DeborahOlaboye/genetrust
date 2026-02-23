/**
 * @file useMultiAccount — React hook for managing multiple Stacks wallet accounts
 * @module hooks/useMultiAccount
 *
 * Provides a React interface over the walletService multi-account APIs.
 * Supports institutional workflows where users manage several addresses
 * (e.g. hot wallet + hardware wallet + watch-only) within a single session.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { walletService } from '../services/walletService';

/**
 * @typedef {Object} AccountEntry
 * @property {string} address  - Stacks address
 * @property {string} label    - Human-readable label
 * @property {string} network  - 'mainnet' | 'testnet'
 * @property {string} source   - 'stacks-connect' | 'ledger' | 'imported'
 */

/**
 * @typedef {Object} MultiAccountState
 * @property {AccountEntry[]} accounts           - All registered accounts
 * @property {AccountEntry|null} activeAccount   - Currently selected account
 * @property {number} activeIndex                - Index of the active account
 * @property {string|null} address               - Address of the active account
 * @property {boolean} isConnected               - Whether any account is active
 * @property {boolean} isLedgerConnected         - Whether a Ledger device is open
 */

/**
 * Hook for multi-account wallet management.
 *
 * @returns {MultiAccountState & {
 *   addAccount: (address: string, label: string, network?: string, source?: string) => void,
 *   switchAccount: (index: number) => void,
 *   switchAccountByAddress: (address: string) => void,
 *   removeAccount: (index: number) => void,
 *   renameAccount: (index: number, label: string) => void,
 *   connectLedger: (opts?: {network?: string, transport?: string}) => Promise<string>,
 *   disconnectLedger: () => Promise<void>,
 *   error: string|null,
 *   clearError: () => void,
 * }}
 */
const useMultiAccount = () => {
  const [accounts, setAccounts] = useState(() => walletService.getAccounts());
  const [activeIndex, setActiveIndex]     = useState(0);
  const [isConnected, setIsConnected]     = useState(() => walletService.isConnected());
  const [isLedgerConnected, setIsLedger]  = useState(() => walletService.isLedgerConnected());
  const [error, setError]                 = useState(null);

  // Sync state whenever walletService emits a change
  useEffect(() => {
    const unsubscribe = walletService.addListener(() => {
      setAccounts(walletService.getAccounts());
      const active = walletService.getActiveAccount();
      setActiveIndex(
        active ? walletService.getAccounts().findIndex(a => a.address === active.address) : 0
      );
      setIsConnected(walletService.isConnected());
      setIsLedger(walletService.isLedgerConnected());
    });

    // Sync on mount
    setAccounts(walletService.getAccounts());
    setIsConnected(walletService.isConnected());
    setIsLedger(walletService.isLedgerConnected());

    return unsubscribe;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const addAccount = useCallback((address, label, network = 'testnet', source = 'imported') => {
    try {
      clearError();
      walletService.addAccount(address, label, network, source);
    } catch (err) {
      setError(err.message);
    }
  }, [clearError]);

  const switchAccount = useCallback((index) => {
    try {
      clearError();
      walletService.switchAccount(index);
    } catch (err) {
      setError(err.message);
    }
  }, [clearError]);

  const switchAccountByAddress = useCallback((address) => {
    try {
      clearError();
      walletService.switchAccountByAddress(address);
    } catch (err) {
      setError(err.message);
    }
  }, [clearError]);

  const removeAccount = useCallback((index) => {
    try {
      clearError();
      walletService.removeAccount(index);
    } catch (err) {
      setError(err.message);
    }
  }, [clearError]);

  const renameAccount = useCallback((index, label) => {
    try {
      clearError();
      walletService.renameAccount(index, label);
    } catch (err) {
      setError(err.message);
    }
  }, [clearError]);

  const connectLedger = useCallback(async (opts = {}) => {
    try {
      clearError();
      const address = await walletService.connectLedger(opts);
      return address;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [clearError]);

  const disconnectLedger = useCallback(async () => {
    try {
      clearError();
      await walletService.disconnectLedger();
    } catch (err) {
      setError(err.message);
    }
  }, [clearError]);

  const activeAccount = useMemo(
    () => accounts[activeIndex] || null,
    [accounts, activeIndex],
  );

  return {
    // State
    accounts,
    activeAccount,
    activeIndex,
    address:          activeAccount?.address || null,
    isConnected,
    isLedgerConnected,
    error,

    // Account management
    addAccount,
    switchAccount,
    switchAccountByAddress,
    removeAccount,
    renameAccount,

    // Hardware wallet
    connectLedger,
    disconnectLedger,

    // Error helpers
    clearError,
  };
};

export default useMultiAccount;
