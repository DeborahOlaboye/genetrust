import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DatasetUploadWizard } from '../components/upload/DatasetUploadWizard.jsx';

const MOCK_CONTRACT = {
  createVaultDataset: jest.fn().mockResolvedValue({ txId: 'tx-123' }),
  initialize: jest.fn().mockResolvedValue({}),
};
const MOCK_WALLET = { getAddress: jest.fn().mockReturnValue('ST1AAA') };

function renderWizard(props = {}) {
  return render(
    <MemoryRouter>
      <DatasetUploadWizard
        contractService={MOCK_CONTRACT}
        walletService={MOCK_WALLET}
        onComplete={jest.fn()}
        {...props}
      />
    </MemoryRouter>
  );
}

describe('DatasetUploadWizard — initial render', () => {
  it('renders the wizard card with a heading', () => {
    renderWizard();
    expect(screen.getByRole('heading', { name: /register genomic dataset/i })).toBeInTheDocument();
  });

  it('renders the upload progress nav on the file-select step', () => {
    renderWizard();
    expect(screen.getByRole('navigation', { name: /upload progress/i })).toBeInTheDocument();
  });

  it('shows the file drop zone on the initial step', () => {
    renderWizard();
    expect(screen.getByRole('button', { name: /upload genomic file/i })).toBeInTheDocument();
  });

  it('does not show the metadata form on the initial step', () => {
    renderWizard();
    expect(screen.queryByLabelText(/price/i)).not.toBeInTheDocument();
  });
});
