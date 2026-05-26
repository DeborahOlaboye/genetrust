import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
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

jest.mock('../components/landing/Navigation.jsx', () => () => <nav />);

const MOCK_DATASETS = [{ id: 1, description: 'Alpha' }, { id: 2, description: 'Beta' }];

beforeEach(() => {
  jest.clearAllMocks();
  contractService.listMyDatasets.mockResolvedValue([...MOCK_DATASETS]);
  contractService.fetchConsentRecord.mockResolvedValue(null);
  contractService.fetchGdprRecord.mockResolvedValue(null);
  contractService.getConsentChangeCount.mockResolvedValue(0);
});

describe('ConsentPage — accessibility', () => {
  it('has exactly one h1 heading', async () => {
    await act(async () => { render(<ConsentPage />); });
    const h1s = document.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Consent Management');
  });

  it('has a skip-to-content link targeting consent-main', async () => {
    await act(async () => { render(<ConsentPage />); });
    const skip = screen.getByText('Skip to main content');
    expect(skip.getAttribute('href')).toBe('#consent-main');
  });

  it('main landmark has aria-label', async () => {
    await act(async () => { render(<ConsentPage />); });
    expect(screen.getByRole('main', { name: /consent management/i })).toBeInTheDocument();
  });

  it('Refresh button has descriptive aria-label', async () => {
    await act(async () => { render(<ConsentPage />); });
    expect(screen.getByRole('button', { name: /refresh datasets/i })).toBeInTheDocument();
  });

  it('dataset select has a visible label', async () => {
    await act(async () => { render(<ConsentPage />); });
    await waitFor(() => screen.getByRole('combobox'));
    expect(screen.getByLabelText(/select dataset/i)).toBeInTheDocument();
  });

  it('polite live region exists for loading state', async () => {
    await act(async () => { render(<ConsentPage />); });
    const statusRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(statusRegion).toBeInTheDocument();
  });

  it('assertive live region exists for save/error announcements', async () => {
    await act(async () => { render(<ConsentPage />); });
    const assertiveRegion = document.querySelector('[aria-live="assertive"]');
    expect(assertiveRegion).toBeInTheDocument();
  });

  it('main element has aria-busy attribute', async () => {
    await act(async () => { render(<ConsentPage />); });
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('aria-busy');
  });

  it('error banner has role=alert', async () => {
    contractService.listMyDatasets.mockRejectedValue(new Error('Oops'));
    await act(async () => { render(<ConsentPage />); });
    await waitFor(() => screen.getByRole('alert'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
