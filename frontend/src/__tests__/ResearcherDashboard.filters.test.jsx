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

jest.mock('../components/landing/Navigation.jsx', () => () => <nav />);

const LISTINGS = [
  { listingId: 1, dataId: 1, price: 3_000_000, accessLevel: 3, owner: 'ST1AAA' },
  { listingId: 2, dataId: 2, price: 1_000_000, accessLevel: 1, owner: 'ST2BBB' },
  { listingId: 3, dataId: 3, price: 2_000_000, accessLevel: 2, owner: 'ST3CCC' },
];

beforeEach(() => {
  jest.clearAllMocks();
  contractService.listMarketplace.mockResolvedValue([...LISTINGS]);
});

describe('ResearcherDashboard — filter controls', () => {
  it('shows all listings when min access filter is "All levels"', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() => screen.getByText(/Listing #1/));
    expect(screen.getByText(/Listing #2/)).toBeInTheDocument();
    expect(screen.getByText(/Listing #3/)).toBeInTheDocument();
  });

  it('hides listings below the min access filter level', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() => screen.getByText(/Listing #1/));
    const filterSelect = screen.getByLabelText('Minimum listing access level');
    await act(async () => {
      fireEvent.change(filterSelect, { target: { value: '2' } });
    });
    // accessLevel=1 listing should be hidden
    expect(screen.queryByText(/Listing #2/)).not.toBeInTheDocument();
    // accessLevel=2 and 3 should remain
    expect(screen.getByText(/Listing #1/)).toBeInTheDocument();
    expect(screen.getByText(/Listing #3/)).toBeInTheDocument();
  });

  it('shows no-results message when filter removes all listings', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() => screen.getByText(/Listing #1/));
    const filterSelect = screen.getByLabelText('Minimum listing access level');
    await act(async () => {
      fireEvent.change(filterSelect, { target: { value: '3' } });
    });
    await waitFor(() =>
      expect(screen.getByText(/No listings match your current filters/i)).toBeInTheDocument()
    );
  });

  it('Clear filters button restores all listings', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() => screen.getByText(/Listing #1/));
    const filterSelect = screen.getByLabelText('Minimum listing access level');
    await act(async () => {
      fireEvent.change(filterSelect, { target: { value: '3' } });
    });
    await waitFor(() => screen.getByRole('button', { name: /clear all marketplace filters/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /clear all marketplace filters/i }));
    });
    await waitFor(() => screen.getByText(/Listing #2/));
    expect(screen.getByText(/Listing #3/)).toBeInTheDocument();
  });
});

describe('ResearcherDashboard — sort toggle', () => {
  it('toggles sort order label on button click', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() => screen.getByText(/Low to High/i));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sort price descending/i }));
    });
    expect(screen.getByText(/High to Low/i)).toBeInTheDocument();
  });

  it('toggles back to ascending on second click', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() => screen.getByText(/Low to High/i));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sort price descending/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sort price ascending/i }));
    });
    expect(screen.getByText(/Low to High/i)).toBeInTheDocument();
  });
});

describe('ResearcherDashboard — stats bar', () => {
  it('shows total listing count in stats bar', async () => {
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() =>
      expect(screen.getByText(/3 total listings/i)).toBeInTheDocument()
    );
  });

  it('stats bar is not shown when no listings', async () => {
    contractService.listMarketplace.mockResolvedValue([]);
    await act(async () => { render(<ResearcherDashboard />); });
    await waitFor(() =>
      expect(screen.queryByRole('group', { name: /marketplace statistics/i })).not.toBeInTheDocument()
    );
  });
});
