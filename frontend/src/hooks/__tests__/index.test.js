import {
  CACHE_TTL,
  BREAKPOINTS,
  useErrorHandler,
  useAnalytics,
  useLoadingState,
  useOptimisticUpdate,
  useOptimizedQuery,
  usePerformance,
  useResponsive,
  BREAKPOINTS,
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

  it('exports CACHE_TTL with SHORT, DEFAULT and LONG keys', () => {
    expect(CACHE_TTL).toBeDefined();
    expect(CACHE_TTL).toHaveProperty('SHORT');
    expect(CACHE_TTL).toHaveProperty('DEFAULT');
    expect(CACHE_TTL).toHaveProperty('LONG');
  });

  it('exports BREAKPOINTS as an object with mobile/tablet/laptop/desktop keys', () => {
    expect(BREAKPOINTS).toBeDefined();
    expect(typeof BREAKPOINTS).toBe('object');
    expect(BREAKPOINTS).toHaveProperty('mobile');
    expect(BREAKPOINTS).toHaveProperty('tablet');
    expect(BREAKPOINTS).toHaveProperty('laptop');
    expect(BREAKPOINTS).toHaveProperty('desktop');
  });
});
