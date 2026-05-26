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

const MOCK_DATASETS = [
  { id: 1, description: 'Dataset Alpha' },
  { id: 2, description: 'Dataset Beta' },
];

beforeEach(() => {
  jest.clearAllMocks();
  contractService.listMyDatasets.mockResolvedValue([...MOCK_DATASETS]);
  contractService.getStatus.mockResolvedValue({ mode: 'mock' });
  contractService.initialize.mockResolvedValue({});
  walletService.isConnected.mockResolvedValue(true);
  walletService.connect.mockResolvedValue(undefined);
});

describe('usePageDatasets — initial load', () => {
  it('starts with loading true', () => {
    contractService.listMyDatasets.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => usePageDatasets());
    expect(result.current.loading).toBe(true);
  });

  it('sets loading false after fetch completes', async () => {
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('populates datasets after fetch', async () => {
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.datasets).toHaveLength(2));
  });

  it('auto-selects the first dataset id', async () => {
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.selectedId).toBe(1));
  });

  it('does not double-fetch on initial auto-selection', async () => {
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.selectedId).toBe(1));
    // listMyDatasets should only have been called once (mount)
    expect(contractService.listMyDatasets).toHaveBeenCalledTimes(1);
  });

  it('selectedDataset matches selectedId', async () => {
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.selectedDataset).not.toBeNull());
    expect(result.current.selectedDataset.id).toBe(result.current.selectedId);
  });
});

describe('usePageDatasets — error handling', () => {
  it('sets loadError when fetch fails', async () => {
    contractService.listMyDatasets.mockRejectedValue(new Error('Network failure'));
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loadError).toBe('Network failure'));
  });

  it('clears loadError after successful handleRetry', async () => {
    contractService.listMyDatasets
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValue([...MOCK_DATASETS]);
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loadError).toBe('Network failure'));
    await act(() => result.current.handleRetry());
    expect(result.current.loadError).toBeNull();
  });

  it('sets loadError when wallet connect fails', async () => {
    walletService.connect.mockRejectedValue(new Error('User rejected'));
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.handleConnectWallet());
    expect(result.current.loadError).toBe('User rejected');
  });
});

describe('usePageDatasets — dataset selection', () => {
  it('updates selectedId on handleDatasetChange', async () => {
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.handleDatasetChange({ target: { value: '2' } }));
    expect(result.current.selectedId).toBe(2);
  });

  it('changing selection does not trigger a new fetch', async () => {
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsBefore = contractService.listMyDatasets.mock.calls.length;
    act(() => result.current.handleDatasetChange({ target: { value: '2' } }));
    await waitFor(() => expect(result.current.selectedId).toBe(2));
    expect(contractService.listMyDatasets.mock.calls.length).toBe(callsBefore);
  });
});

describe('usePageDatasets — refresh', () => {
  it('re-fetches datasets on handleRefresh', async () => {
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsBefore = contractService.listMyDatasets.mock.calls.length;
    await act(() => result.current.handleRefresh());
    expect(contractService.listMyDatasets.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('clears loadError before refreshing', async () => {
    contractService.listMyDatasets
      .mockRejectedValueOnce(new Error('Oops'))
      .mockResolvedValue([...MOCK_DATASETS]);
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loadError).toBe('Oops'));
    await act(() => result.current.handleRefresh());
    expect(result.current.loadError).toBeNull();
  });

  it('prevents concurrent refreshes', async () => {
    let resolveFirst;
    contractService.listMyDatasets
      .mockResolvedValueOnce([...MOCK_DATASETS])
      .mockImplementationOnce(() => new Promise(r => { resolveFirst = r; }));
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsBefore = contractService.listMyDatasets.mock.calls.length;
    act(() => { result.current.handleRefresh(); });
    await act(() => result.current.handleRefresh());
    // Should not have called listMyDatasets a third time
    expect(contractService.listMyDatasets.mock.calls.length).toBe(callsBefore + 1);
    resolveFirst([...MOCK_DATASETS]);
  });
});

describe('usePageDatasets — empty state', () => {
  it('leaves selectedId as null when no datasets are returned', async () => {
    contractService.listMyDatasets.mockResolvedValue([]);
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.selectedId).toBeNull();
  });

  it('selectedDataset is null when datasets is empty', async () => {
    contractService.listMyDatasets.mockResolvedValue([]);
    const { result } = renderHook(() => usePageDatasets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.selectedDataset).toBeNull();
  });
});
