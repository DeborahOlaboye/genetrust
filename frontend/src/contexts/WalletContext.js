import React, { createContext, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import useWallet from '../hooks/useWallet';
import useMultiAccount from '../hooks/useMultiAccount';
import useSessionManager from '../hooks/useSessionManager';
import useTxBatch from '../hooks/useTxBatch';

// ── Context default shape ────────────────────────────────────────────────────
const WalletContext = createContext({
  // ── Core wallet state ─────────────────────────────────────────────────
  address:            null,
  isConnected:        false,
  network:            null,
  provider:           null,
  availableProviders: [],
  isLoading:          true,
  error:              null,

  // ── Core wallet methods ───────────────────────────────────────────────
  connect:         () => {},
  disconnect:      () => {},
  signMessage:     () => {},
  sendTransaction: () => {},

  // ── Multi-account ─────────────────────────────────────────────────────
  accounts:              [],
  activeAccount:         null,
  activeIndex:           0,
  addAccount:            () => {},
  switchAccount:         () => {},
  switchAccountByAddress:() => {},
  removeAccount:         () => {},
  renameAccount:         () => {},

  // ── Hardware wallet ───────────────────────────────────────────────────
  isLedgerConnected: false,
  connectLedger:     () => Promise.resolve(),
  disconnectLedger:  () => Promise.resolve(),

  // ── Session management ────────────────────────────────────────────────
  isSessionValid:  true,
  expiresAt:       null,
  msRemaining:     null,
  isExpiringSoon:  false,
  refreshSession:  () => {},
  expireSession:   () => {},

  // ── Transaction batching ──────────────────────────────────────────────
  txQueue:         [],
  txQueueLength:   0,
  isBatchProcessing: false,
  batchResults:    [],
  enqueueTx:       () => {},
  dequeueTx:       () => {},
  clearTxQueue:    () => {},
  flushTxQueue:    () => Promise.resolve([]),

  // ── Constants ─────────────────────────────────────────────────────────
  PROVIDERS: {},
  providerStatuses: [],
});

/**
 * WalletProvider exposes the full Stacks Connect 8.x feature set:
 *   • Core connection (Reown, Hiro)
 *   • Multi-account management
 *   • Hardware wallet (Ledger) integration
 *   • Session lifecycle management
 *   • Transaction batch queue
 *
 * @param {Object}   props
 * @param {React.ReactNode} props.children
 * @param {Object}   [props.config]                       - Passed to useWallet
 * @param {Object}   [props.sessionOptions]               - Passed to useSessionManager
 * @param {boolean}  [props.sessionOptions.autoDisconnect=true]
 * @param {number}   [props.sessionOptions.warnBeforeMs=300000]
 * @param {Function} [props.sessionOptions.onExpiry]
 * @param {Function} [props.sessionOptions.onExpiringSoon]
 */
export const WalletProvider = ({ children, config = {}, sessionOptions = {} }) => {
  const wallet   = useWallet(config);
  const multi    = useMultiAccount();
  const session  = useSessionManager(sessionOptions);
  const batch    = useTxBatch();

  const value = useMemo(() => ({
    // Core wallet
    address:            wallet.address,
    isConnected:        wallet.isConnected,
    network:            wallet.network,
    provider:           wallet.provider,
    availableProviders: wallet.availableProviders,
    isLoading:          wallet.isLoading,
    error:              wallet.error || multi.error,
    connect:            wallet.connect,
    disconnect:         wallet.disconnect,
    signMessage:        wallet.signMessage,
    sendTransaction:    wallet.sendTransaction,
    PROVIDERS:          wallet.PROVIDERS,
    providerStatuses:   wallet.providerStatuses,

    // Multi-account
    accounts:               multi.accounts,
    activeAccount:          multi.activeAccount,
    activeIndex:            multi.activeIndex,
    addAccount:             multi.addAccount,
    switchAccount:          multi.switchAccount,
    switchAccountByAddress: multi.switchAccountByAddress,
    removeAccount:          multi.removeAccount,
    renameAccount:          multi.renameAccount,

    // Hardware wallet
    isLedgerConnected: multi.isLedgerConnected,
    connectLedger:     multi.connectLedger,
    disconnectLedger:  multi.disconnectLedger,

    // Session management
    isSessionValid:  session.isSessionValid,
    expiresAt:       session.expiresAt,
    msRemaining:     session.msRemaining,
    isExpiringSoon:  session.isExpiringSoon,
    refreshSession:  session.refreshSession,
    expireSession:   session.expireSession,

    // Transaction batching
    txQueue:           batch.queue,
    txQueueLength:     batch.queueLength,
    isBatchProcessing: batch.isProcessing,
    batchResults:      batch.results,
    enqueueTx:         batch.enqueueTx,
    dequeueTx:         batch.dequeueTx,
    clearTxQueue:      batch.clearQueue,
    flushTxQueue:      batch.flushQueue,
  }), [wallet, multi, session, batch]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

WalletProvider.propTypes = {
  children:       PropTypes.node.isRequired,
  config:         PropTypes.object,
  sessionOptions: PropTypes.shape({
    autoDisconnect:  PropTypes.bool,
    warnBeforeMs:    PropTypes.number,
    onExpiry:        PropTypes.func,
    onExpiringSoon:  PropTypes.func,
  }),
};

/**
 * Custom hook to consume the WalletContext.
 * Must be used inside a <WalletProvider>.
 *
 * @returns {Object} Full wallet context value
 */
export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};

export default WalletContext;
