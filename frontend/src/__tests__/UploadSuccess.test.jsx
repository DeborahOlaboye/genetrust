import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UploadSuccess } from '../components/upload/UploadSuccess.jsx';

jest.mock('../components/TransactionTracker.jsx', () => ({
  TransactionTracker: () => <div data-testid="tx-tracker" />,
}));

const DEFAULT_PROPS = {
  txId: 'tx-abc123',
  hexHash: 'deadbeef',
  fileName: 'genome.vcf',
  onRegisterAnother: jest.fn(),
};

function renderSuccess(props = {}) {
  return render(
    <MemoryRouter>
      <UploadSuccess {...DEFAULT_PROPS} {...props} />
    </MemoryRouter>
  );
}

describe('UploadSuccess — marketplace link', () => {
  it('renders the View Marketplace link', () => {
    renderSuccess();
    expect(screen.getByRole('link', { name: /view marketplace/i })).toBeInTheDocument();
  });

  it('marketplace link points to /researcher', () => {
    renderSuccess();
    expect(screen.getByRole('link', { name: /view marketplace/i })).toHaveAttribute('href', '/researcher');
  });
});

describe('UploadSuccess — register another button', () => {
  it('renders the Register another dataset button', () => {
    renderSuccess();
    expect(screen.getByRole('button', { name: /register another dataset/i })).toBeInTheDocument();
  });

  it('has a descriptive aria-label on the register another button', () => {
    renderSuccess();
    const btn = screen.getByRole('button', { name: /start the upload wizard again/i });
    expect(btn).toBeInTheDocument();
  });
});

describe('UploadSuccess — content', () => {
  it('displays the registered file name', () => {
    renderSuccess();
    expect(screen.getByText(/genome\.vcf/)).toBeInTheDocument();
  });

  it('displays the integrity hash', () => {
    renderSuccess();
    expect(screen.getByText(/deadbeef/)).toBeInTheDocument();
  });

  it('renders the TransactionTracker component', () => {
    renderSuccess();
    expect(screen.getByTestId('tx-tracker')).toBeInTheDocument();
  });
});
