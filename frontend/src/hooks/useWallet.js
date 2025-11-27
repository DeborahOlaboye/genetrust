import { useState, useEffect, useCallback, useMemo } from 'react';
import { createLogger } from '../utils/logger';
import WalletManager, { PROVIDERS } from '../services/wallet/WalletManager';

const logger = createLogger({ module: 'useWallet' });

// Default configuration for the wallet manager
const defaultConfig = {
  defaultProvider: PROVIDERS.REOWN,
  network: process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet',
  providers: {
    [PROVIDERS.REOWN]: {
      appName: 'GeneTrust',
      appIcon: typeof window !== 'undefined' ? `${window.location.origin}/logo192.png` : '/logo192.png',
      appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://genetrust.xyz'
    },
    [PROVIDERS.HIRO]: {
      appName: 'GeneTrust',
      appIcon: typeof window !== 'undefined' ? `${window.location.origin}/logo192.png` : '/logo192.png',
      appDomain: typeof window !== 'undefined' ? window.location.hostname : 'genetrust.xyz'
    }
  }
};

// Create a singleton instance of the wallet manager
let walletManagerInstance = null;

const getWalletManager = (config = {}) => {
  if (!walletManagerInstance) {
    const mergedConfig = {
      ...defaultConfig,
      ...config,
      providers: {
        ...defaultConfig.providers,
        ...(config.providers || {})
      }
    };
    
    walletManagerInstance = new WalletManager(mergedConfig);
  }
  return walletManagerInstance;
};

/**
 * Custom hook for managing wallet connections
 * @param {Object} config - Configuration options for the wallet manager
 * @returns {Object} Wallet state and methods
 */
const useWallet = (config = {}) => {
  const [walletManager] = useState(() => getWalletManager(config));
  const [state, setState] = useState({
    address: null,
    isConnected: false,
    network: null,
    provider: null,
    availableProviders: [],
    isLoading: true,
    error: null
  });

  // Update state from wallet manager
  const updateState = useCallback(() => {
    const walletState = walletManager.getState();
    setState(prevState => ({
      ...prevState,
      ...walletState,
      isLoading: false,
      error: null
    }));
  }, [walletManager]);

  // Initialize wallet manager
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        await walletManager.init();
        if (isMounted) {
          updateState();
        }
      } catch (error) {
        logger.error('Failed to initialize wallet manager', { error });
        if (isMounted) {
          setState(prevState => ({
            ...prevState,
            isLoading: false,
            error: error.message
          }));
        }
      }
    };

    // Add state change listener
    const cleanupListener = walletManager.addListener(updateState);

    // Initialize
    init();

    // Cleanup
    return () => {
      isMounted = false;
      cleanupListener();
      // Don't destroy the wallet manager as it's a singleton
    };
  }, [walletManager, updateState]);

  // Connect to a wallet provider
  const connect = useCallback(async (providerName) => {
    try {
      setState(prevState => ({ ...prevState, isLoading: true, error: null }));
      await walletManager.connect(providerName);
    } catch (error) {
      logger.error('Failed to connect wallet', { error });
      setState(prevState => ({
        ...prevState,
        isLoading: false,
        error: error.message
      }));
      throw error;
    }
  }, [walletManager]);

  // Disconnect from the current wallet
  const disconnect = useCallback(async () => {
    try {
      setState(prevState => ({ ...prevState, isLoading: true }));
      await walletManager.disconnect();
    } catch (error) {
      logger.error('Failed to disconnect wallet', { error });
      setState(prevState => ({
        ...prevState,
        isLoading: false,
        error: error.message
      }));
      throw error;
    }
  }, [walletManager]);

  // Sign a message
  const signMessage = useCallback(async (message) => {
    try {
      setState(prevState => ({ ...prevState, isLoading: true, error: null }));
      const signature = await walletManager.signMessage(message);
      setState(prevState => ({ ...prevState, isLoading: false }));
      return signature;
    } catch (error) {
      logger.error('Failed to sign message', { error });
      setState(prevState => ({
        ...prevState,
        isLoading: false,
        error: error.message
      }));
      throw error;
    }
  }, [walletManager]);

  // Send a transaction
  const sendTransaction = useCallback(async (transaction) => {
    try {
      setState(prevState => ({ ...prevState, isLoading: true, error: null }));
      const result = await walletManager.sendTransaction(transaction);
      setState(prevState => ({ ...prevState, isLoading: false }));
      return result;
    } catch (error) {
      logger.error('Failed to send transaction', { error });
      setState(prevState => ({
        ...prevState,
        isLoading: false,
        error: error.message
      }));
      throw error;
    }
  }, [walletManager]);

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    // State
    ...state,
    
    // Methods
    connect,
    disconnect,
    signMessage,
    sendTransaction,
    
    // Provider constants
    PROVIDERS
  }), [state, connect, disconnect, signMessage, sendTransaction]);
};

export { PROVIDERS };
export default useWallet;
