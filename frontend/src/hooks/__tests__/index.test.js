import {
  useErrorHandler,
  useAnalytics,
  useLoadingState,
  useOptimisticUpdate,
  useOptimizedQuery,
  usePerformance,
  useResponsive,
  useKeyboardNavigation,
  useRovingTabIndex,
  useTouch,
  useBlockchainCache,
  useTransactionStatus,
  useTransactionRetry,
  useWallet,
  useMultiAccount,
  useSessionManager,
  useTxBatch,
  useDatasetUpload,
  useDatasetList,
  useConsentPolicy,
} from '../index';

describe('hooks barrel export', () => {
  const hooks = {
    useErrorHandler,
    useAnalytics,
    useLoadingState,
    useOptimisticUpdate,
    useOptimizedQuery,
    usePerformance,
    useResponsive,
    useKeyboardNavigation,
    useRovingTabIndex,
    useTouch,
    useBlockchainCache,
    useTransactionStatus,
    useTransactionRetry,
    useWallet,
    useMultiAccount,
    useSessionManager,
    useTxBatch,
    useDatasetUpload,
    useDatasetList,
    useConsentPolicy,
  };

  Object.entries(hooks).forEach(([name, hook]) => {
    it(`exports ${name} as a function`, () => {
      expect(hook).toBeDefined();
      expect(typeof hook).toBe('function');
    });
  });
});
