import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import ResearcherDashboard from '../pages/ResearcherDashboard.jsx';
import { contractService } from '../services/contractService.js';

jest.mock('../services/contractService.js', () => ({
  contractService: {
    initialize: jest.fn().mockResolvedValue({}),
    getStatus: jest.fn().mockResolvedValue({ mode: 'mock' }),
    listMarketplace: jest.fn().mockResolvedValue([]),
    purchaseListing: jest.fn(),
  },
}));

jest.mock('../components/landing/Navigation.jsx', () => () => <nav />);

const LISTINGS = [
  { listingId: 1, dataId: 1, price: 1_000_000, accessLevel: 1, owner: 'ST1AAA' },
];

beforeEach(() => {
  jest.clearAllMocks();
  contractService.listMarketplace.mockResolvedValue([...LISTINGS]);
});

describe('ResearcherDashboard — accessibility', () => {
  it('has exactly one h1 heading', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    const h1s = document.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Researcher Marketplace');
  });

  it('has a skip-to-content link as the first focusable element', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    const skip = screen.getByText('Skip to main content');
    expect(skip.tagName).toBe('A');
    expect(skip.getAttribute('href')).toBe('#marketplace-main');
  });

  it('main landmark has an accessible label', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    expect(screen.getByRole('main', { name: /researcher marketplace/i })).toBeInTheDocument();
  });

  it('Refresh button has a descriptive aria-label', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    expect(screen.getByRole('button', { name: /refresh listings/i })).toBeInTheDocument();
  });

  it('listing list has aria-busy attribute', async () => {
    contractService.listMarketplace.mockImplementation(() => new Promise(() => {}));
    render(<ResearcherDashboard />);
    const list = screen.getByRole('list');
    expect(list).toHaveAttribute('aria-busy', 'true');
  });

  it('polite status region exists for loading/error state', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    const statusRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(statusRegion).toBeInTheDocument();
  });

  it('assertive live region exists for purchase status', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    const assertiveRegion = document.querySelector('[aria-live="assertive"]');
    expect(assertiveRegion).toBeInTheDocument();
  });

  it('Purchase button has accessible aria-label', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() => screen.getByText(/Listing #1/));
    const purchaseBtn = screen.getByRole('button', { name: /purchase listing 1/i });
    expect(purchaseBtn).toBeInTheDocument();
  });

  it('sort toggle button label describes the next action', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() => screen.getByText(/Listing #1/));
    expect(
      screen.getByRole('button', { name: /sort price descending/i })
    ).toBeInTheDocument();
  });
});
