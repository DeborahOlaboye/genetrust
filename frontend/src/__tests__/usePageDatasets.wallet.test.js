import { renderHook, act, waitFor } from '@testing-library/react';
import { usePageDatasets } from '../hooks/usePageDatasets.js';
import { contractService } from '../services/contractService.js';
import { walletService } from '../services/walletService.js';

jest.mock('../services/contractService.js', () => ({
  contractService: {
    initialize: jest.fn().mockResolvedValue({}),
    getStatus: jest.fn().mockResolvedValue({ mode: 'mock' }),
    listMyDatasets: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../services/walletService.js', () => ({
  walletService: {
    isConnected: jest.fn().mockResolvedValue(true),
    getAddress: jest.fn().mockReturnValue('ST1TEST'),
    connect: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../config/app.js', () => ({
  APP_CONFIG: { USE_REAL_SDK: false },
}));

const MOCK_DATASETS = [{ id: 5, description: 'Test Dataset' }];

beforeEach(() => {
  jest.clearAllMocks();
  contractService.listMyDatasets.mockResolvedValue([...MOCK_DATASETS]);
  contractService.getStatus.mockResolvedValue({ mode: 'mock' });
});

describe('usePageDatasets — wallet connect', () => {
  it('sets walletConnected to true on successful connect', async () => {
    walletService.connect.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.handleConnectWallet());
    expect(result.current.walletConnected).toBe(true);
  });

  it('reloads datasets after wallet connect', async () => {
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsBefore = contractService.listMyDatasets.mock.calls.length;
    await act(() => result.current.handleConnectWallet());
    expect(contractService.listMyDatasets.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('surfaces wallet connect error in loadError', async () => {
    walletService.connect.mockRejectedValue(new Error('Popup closed'));
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.handleConnectWallet());
    expect(result.current.loadError).toBe('Popup closed');
  });

  it('does not change walletConnected on connect error', async () => {
    walletService.connect.mockRejectedValue(new Error('Denied'));
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const connectedBefore = result.current.walletConnected;
    await act(() => result.current.handleConnectWallet());
    expect(result.current.walletConnected).toBe(connectedBefore);
  });
});

describe('usePageDatasets — status', () => {
  it('sets status from getStatus response', async () => {
    contractService.getStatus.mockResolvedValue({ mode: 'live' });
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toEqual({ mode: 'live' });
  });

  it('status is null before datasets are loaded', () => {
    contractService.listMyDatasets.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => usePageDatasets());
    expect(result.current.status).toBeNull();
  });
});

describe('usePageDatasets — handleRetry re-entry guard', () => {
  it('does not call loadDatasets when loading is already true', async () => {
    contractService.listMyDatasets
      .mockResolvedValueOnce([...MOCK_DATASETS])
      .mockImplementationOnce(() => new Promise(() => {}));
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.handleRetry(); });
    const callsMid = contractService.listMyDatasets.mock.calls.length;
    await act(() => result.current.handleRetry());
    expect(contractService.listMyDatasets.mock.calls.length).toBe(callsMid);
  });
});
