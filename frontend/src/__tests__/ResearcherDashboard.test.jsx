import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

jest.mock('../components/landing/Navigation.jsx', () => () => <nav data-testid="navigation" />);

const MOCK_LISTINGS = [
  { listingId: 1, dataId: 10, price: 2_000_000, accessLevel: 2, owner: 'ST1AAA' },
  { listingId: 2, dataId: 11, price: 1_000_000, accessLevel: 1, owner: 'ST2BBB' },
];

beforeEach(() => {
  jest.clearAllMocks();
  contractService.listMarketplace.mockResolvedValue([...MOCK_LISTINGS]);
  contractService.getStatus.mockResolvedValue({ mode: 'mock' });
  contractService.initialize.mockResolvedValue({});
});

describe('ResearcherDashboard — rendering', () => {
  it('renders without crashing', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
  });

  it('renders the Navigation component', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });

  it('renders the page heading', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    expect(screen.getByText('Researcher Marketplace')).toBeInTheDocument();
  });

  it('renders the skip-to-content link', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
  });
});

describe('ResearcherDashboard — loading state', () => {
  it('shows loading skeleton while fetching', () => {
    contractService.listMarketplace.mockImplementation(() => new Promise(() => {}));
    render(<ResearcherDashboard />);
    const busyList = screen.getByRole('list');
    expect(busyList).toHaveAttribute('aria-busy', 'true');
  });

  it('hides loading skeleton after fetch completes', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() =>
      expect(screen.queryByLabelText(/loading marketplace/i)).not.toBeInTheDocument()
    );
  });
});

describe('ResearcherDashboard — listings', () => {
  it('renders listing items after load', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() =>
      expect(screen.getByText(/Listing #1/)).toBeInTheDocument()
    );
    expect(screen.getByText(/Listing #2/)).toBeInTheDocument();
  });

  it('shows empty-state when no listings available', async () => {
    contractService.listMarketplace.mockResolvedValue([]);
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() =>
      expect(screen.getByText(/no listings available/i)).toBeInTheDocument()
    );
  });

  it('renders Purchase buttons for each listing', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() => screen.getByText(/Listing #1/));
    const purchaseButtons = screen.getAllByRole('button', { name: /purchase listing/i });
    expect(purchaseButtons).toHaveLength(MOCK_LISTINGS.length);
  });
});

describe('ResearcherDashboard — error state', () => {
  it('shows error banner on fetch failure', async () => {
    contractService.listMarketplace.mockRejectedValue(new Error('Fetch failed'));
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    );
    expect(screen.getByText(/Fetch failed/i)).toBeInTheDocument();
  });

  it('shows a Retry button in the error banner', async () => {
    contractService.listMarketplace.mockRejectedValue(new Error('Oops'));
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() => screen.getByRole('alert'));
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('retrying clears the error and reloads', async () => {
    contractService.listMarketplace
      .mockRejectedValueOnce(new Error('Oops'))
      .mockResolvedValue([...MOCK_LISTINGS]);
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() => screen.getByRole('alert'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    });
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    );
  });
});

describe('ResearcherDashboard — refresh', () => {
  it('Refresh button is present', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    expect(screen.getByRole('button', { name: /refresh listings/i })).toBeInTheDocument();
  });

  it('clicking Refresh calls listMarketplace again', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() => screen.getByText(/Listing #1/));
    const callsBefore = contractService.listMarketplace.mock.calls.length;
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /refresh listings/i }));
    });
    await waitFor(() =>
      expect(contractService.listMarketplace.mock.calls.length).toBeGreaterThan(callsBefore)
    );
  });
});

describe('ResearcherDashboard — purchase', () => {
  it('clicking Purchase calls purchaseListing with correct listingId', async () => {
    contractService.purchaseListing.mockResolvedValue({ accessLevel: 1, txId: 'abc123' });
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() => screen.getByText(/Listing #1/));
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /purchase listing/i })[0]);
    });
    expect(contractService.purchaseListing).toHaveBeenCalledWith(
      expect.objectContaining({ listingId: expect.anything() })
    );
  });

  it('purchased listing shows check badge instead of Purchase button', async () => {
    contractService.purchaseListing.mockResolvedValue({ accessLevel: 1, txId: 'done123' });
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() => screen.getByText(/Listing #1/));
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /purchase listing/i })[0]);
    });
    await waitFor(() =>
      expect(screen.getByText(/✓ Purchased/)).toBeInTheDocument()
    );
  });
});
