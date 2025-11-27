import React, { createContext, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import useWallet from '../hooks/useWallet';

// Create a context with default values
const WalletContext = createContext({
  // State
  address: null,
  isConnected: false,
  network: null,
  provider: null,
  availableProviders: [],
  isLoading: true,
  error: null,
  
  // Methods
  connect: () => {},
  disconnect: () => {},
  signMessage: () => {},
  sendTransaction: () => {},
  
  // Constants
  PROVIDERS: {}
});

/**
 * WalletProvider component that provides wallet functionality to the app
 */
export const WalletProvider = ({ children, config = {} }) => {
  const wallet = useWallet(config);
  
  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    ...wallet
  }), [wallet]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

WalletProvider.propTypes = {
  children: PropTypes.node.isRequired,
  config: PropTypes.object
};

/**
 * Custom hook to use the wallet context
 * @returns {Object} Wallet context value
 */
export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};

export default WalletContext;
