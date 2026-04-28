import {
  CACHE_TTL,
  BREAKPOINTS,
  SWIPE_DIRECTION,
  ANALYTICS_EVENTS,
  QUERY_DEFAULTS,
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

  it('exports QUERY_DEFAULTS with cacheTTL, retryAttempts and retryDelay', () => {
    expect(QUERY_DEFAULTS).toBeDefined();
    expect(QUERY_DEFAULTS).toHaveProperty('cacheTTL');
    expect(QUERY_DEFAULTS).toHaveProperty('retryAttempts');
    expect(QUERY_DEFAULTS).toHaveProperty('retryDelay');
  });

  it('exports CACHE_TTL with SHORT, DEFAULT and LONG keys', () => {
    expect(CACHE_TTL).toBeDefined();
    expect(CACHE_TTL).toHaveProperty('SHORT');
    expect(CACHE_TTL).toHaveProperty('DEFAULT');
    expect(CACHE_TTL).toHaveProperty('LONG');
  });

  it('exports SWIPE_DIRECTION with LEFT/RIGHT/UP/DOWN keys', () => {
    expect(SWIPE_DIRECTION).toBeDefined();
    expect(SWIPE_DIRECTION).toHaveProperty('LEFT');
    expect(SWIPE_DIRECTION).toHaveProperty('RIGHT');
    expect(SWIPE_DIRECTION).toHaveProperty('UP');
    expect(SWIPE_DIRECTION).toHaveProperty('DOWN');
  });

  it('exports ANALYTICS_EVENTS with standard event names', () => {
    expect(ANALYTICS_EVENTS).toBeDefined();
    expect(ANALYTICS_EVENTS).toHaveProperty('PAGE_VIEW');
    expect(ANALYTICS_EVENTS).toHaveProperty('ERROR');
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
