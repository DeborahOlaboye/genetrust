// Hooks barrel — import any hook from this single entry point.
// Usage: import { useWallet, useDatasetList } from '../hooks';

// --- Error & Loading ---
export { default as useErrorHandler } from './useErrorHandler';
export { default as useLoadingState } from './useLoadingState';

// --- Data & Caching ---
export { useOptimisticUpdate } from './useOptimisticUpdate';
export { useOptimizedQuery, QUERY_DEFAULTS } from './useOptimizedQuery';
export { useBlockchainCache, CACHE_TTL } from './useBlockchainCache';

// --- Performance & Analytics ---
export { usePerformance } from './usePerformance';
export { default as useAnalytics, ANALYTICS_EVENTS } from './useAnalytics';

// --- UI & Interaction ---
export { useResponsive, BREAKPOINTS } from './useResponsive';
export { useKeyboardNavigation, useRovingTabIndex } from './useKeyboardNavigation';
export { useTouch, SWIPE_DIRECTION } from './useTouch';

// --- Blockchain / Wallet ---
export { useTransactionStatus } from './useTransactionStatus';
export { useTransactionRetry } from './useTransactionRetry';
export { useWallet } from './useWallet';
export { useMultiAccount } from './useMultiAccount';
export { useSessionManager } from './useSessionManager';
export { useTxBatch } from './useTxBatch';

// --- Domain ---
export { useDatasetUpload, STEPS, ACCESS_LEVELS } from './useDatasetUpload.js';
export { useDatasetList } from './useDatasetList.js';
export { useConsentPolicy, JURISDICTIONS, CONSENT_TYPES, DEFAULT_DURATION_BLOCKS } from './useConsentPolicy.js';
