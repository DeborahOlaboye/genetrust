import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ConsentPage from '../pages/ConsentPage.jsx';
import { contractService } from '../services/contractService.js';
import { walletService } from '../services/walletService.js';

jest.mock('../services/contractService.js', () => ({
  contractService: {
    initialize: jest.fn().mockResolvedValue({}),
    getStatus: jest.fn().mockResolvedValue({ mode: 'mock' }),
    listMyDatasets: jest.fn().mockResolvedValue([]),
    fetchConsentRecord: jest.fn().mockResolvedValue(null),
    fetchGdprRecord: jest.fn().mockResolvedValue(null),
    getConsentChangeCount: jest.fn().mockResolvedValue(0),
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

jest.mock('../components/landing/Navigation.jsx', () => () => <nav data-testid="navigation" />);

const MOCK_DATASETS = [
  { id: 1, description: 'Genome Set Alpha' },
  { id: 2, description: 'Genome Set Beta' },
];

beforeEach(() => {
  jest.clearAllMocks();
  contractService.listMyDatasets.mockResolvedValue([...MOCK_DATASETS]);
  contractService.getStatus.mockResolvedValue({ mode: 'mock' });
  contractService.initialize.mockResolvedValue({});
  contractService.fetchConsentRecord.mockResolvedValue(null);
  contractService.fetchGdprRecord.mockResolvedValue(null);
  contractService.getConsentChangeCount.mockResolvedValue(0);
});

describe('ConsentPage — rendering', () => {
  it('renders without crashing', async () => {
    await act(async () => { render(<ConsentPage />); });
  });

  it('renders the Navigation component', async () => {
    await act(async () => { render(<ConsentPage />); });
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });

  it('renders the Consent Management heading', async () => {
    await act(async () => { render(<ConsentPage />); });
    expect(screen.getByText('Consent Management')).toBeInTheDocument();
  });

  it('renders the skip-to-content link', async () => {
    await act(async () => { render(<ConsentPage />); });
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
  });
});

describe('ConsentPage — dataset loading', () => {
  it('shows loading skeleton while fetching', () => {
    contractService.listMyDatasets.mockImplementation(() => new Promise(() => {}));
    render(<ConsentPage />);
    expect(screen.getByRole('status', { name: /loading datasets/i })).toBeInTheDocument();
  });

  it('renders dataset selector after load', async () => {
    await act(async () => { render(<ConsentPage />); });
    await waitFor(() =>
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    );
  });

  it('dataset selector has an option for each dataset', async () => {
    await act(async () => { render(<ConsentPage />); });
    await waitFor(() => screen.getByRole('combobox'));
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(MOCK_DATASETS.length);
  });

  it('auto-selects first dataset', async () => {
    await act(async () => { render(<ConsentPage />); });
    await waitFor(() => screen.getByRole('combobox'));
    const select = screen.getByRole('combobox');
    expect(Number(select.value)).toBe(MOCK_DATASETS[0].id);
  });

  it('loads datasets exactly once on mount (no double-fetch)', async () => {
    await act(async () => { render(<ConsentPage />); });
    await waitFor(() => screen.getByRole('combobox'));
    expect(contractService.listMyDatasets).toHaveBeenCalledTimes(1);
  });
});

describe('ConsentPage — empty state', () => {
  it('shows empty state when no datasets are returned', async () => {
    contractService.listMyDatasets.mockResolvedValue([]);
    await act(async () => { render(<ConsentPage />); });
    await waitFor(() =>
      expect(screen.getByText(/no datasets found/i)).toBeInTheDocument()
    );
  });

  it('shows a Register Dataset link in empty state', async () => {
    contractService.listMyDatasets.mockResolvedValue([]);
    await act(async () => { render(<ConsentPage />); });
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /register dataset/i })).toBeInTheDocument()
    );
  });
});

describe('ConsentPage — error state', () => {
  it('shows error banner when fetch fails', async () => {
    contractService.listMyDatasets.mockRejectedValue(new Error('Load error'));
    await act(async () => { render(<ConsentPage />); });
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    );
    expect(screen.getByText(/Load error/i)).toBeInTheDocument();
  });

  it('shows Retry button in error banner', async () => {
    contractService.listMyDatasets.mockRejectedValue(new Error('Oops'));
    await act(async () => { render(<ConsentPage />); });
    await waitFor(() => screen.getByRole('alert'));
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('Retry clears error and reloads datasets', async () => {
    contractService.listMyDatasets
      .mockRejectedValueOnce(new Error('Oops'))
      .mockResolvedValue([...MOCK_DATASETS]);
    await act(async () => { render(<ConsentPage />); });
    await waitFor(() => screen.getByRole('alert'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    });
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    );
  });
});

describe('ConsentPage — dataset selection', () => {
  it('changing select value updates the selected dataset breadcrumb', async () => {
    await act(async () => { render(<ConsentPage />); });
    await waitFor(() => screen.getByRole('combobox'));
    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    });
    await waitFor(() =>
      expect(screen.getByText(/Dataset #2/)).toBeInTheDocument()
    );
  });

  it('changing selection does NOT trigger a new fetch', async () => {
    await act(async () => { render(<ConsentPage />); });
    await waitFor(() => screen.getByRole('combobox'));
    const callsBefore = contractService.listMyDatasets.mock.calls.length;
    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    });
    expect(contractService.listMyDatasets.mock.calls.length).toBe(callsBefore);
  });
});

describe('ConsentPage — refresh', () => {
  it('Refresh button is present', async () => {
    await act(async () => { render(<ConsentPage />); });
    expect(screen.getByRole('button', { name: /refresh datasets/i })).toBeInTheDocument();
  });

  it('clicking Refresh triggers a new fetch', async () => {
    await act(async () => { render(<ConsentPage />); });
    await waitFor(() => screen.getByRole('combobox'));
    const callsBefore = contractService.listMyDatasets.mock.calls.length;
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /refresh datasets/i }));
    });
    await waitFor(() =>
      expect(contractService.listMyDatasets.mock.calls.length).toBeGreaterThan(callsBefore)
    );
  });

  it('Refresh clears existing error before fetching', async () => {
    contractService.listMyDatasets
      .mockRejectedValueOnce(new Error('Old error'))
      .mockResolvedValue([...MOCK_DATASETS]);
    await act(async () => { render(<ConsentPage />); });
    await waitFor(() => screen.getByRole('alert'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /refresh datasets/i }));
    });
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    );
  });
});
