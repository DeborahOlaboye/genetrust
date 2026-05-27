import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MetadataForm } from '../components/upload/MetadataForm.jsx';

const BASE_STATE = {
  price: '100',
  accessLevel: 1,
  storageUrl: '',
  description: 'Genome dataset from European cohort',
  error: null,
  fileName: 'sample.vcf',
  fileSize: 1024,
};

const EMPTY_ERRORS = { price: null, description: null, storageUrl: null };

function renderForm(props = {}) {
  const defaults = {
    state: BASE_STATE,
    fieldErrors: EMPTY_ERRORS,
    setField: jest.fn(),
    onBack: jest.fn(),
    onSubmit: jest.fn(),
    submitting: false,
  };
  return render(
    <MemoryRouter>
      <MetadataForm {...defaults} {...props} />
    </MemoryRouter>
  );
}

describe('MetadataForm — price field', () => {
  it('renders the price input', () => {
    renderForm();
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
  });

  it('shows price hint text when there is no price error', () => {
    renderForm();
    expect(screen.getByText(/amount researchers will pay/i)).toBeInTheDocument();
  });

  it('shows price error message when fieldErrors.price is set', () => {
    renderForm({ fieldErrors: { ...EMPTY_ERRORS, price: 'Price must be a positive number.' } });
    expect(screen.getByText('Price must be a positive number.')).toBeInTheDocument();
  });

  it('hides price hint when fieldErrors.price is set', () => {
    renderForm({ fieldErrors: { ...EMPTY_ERRORS, price: 'Price must be a positive number.' } });
    expect(screen.queryByText(/amount researchers will pay/i)).not.toBeInTheDocument();
  });

  it('marks price input as aria-invalid when there is a price error', () => {
    renderForm({ fieldErrors: { ...EMPTY_ERRORS, price: 'Price must be a positive number.' } });
    const input = screen.getByLabelText(/price/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not mark price input as aria-invalid when there is no error', () => {
    renderForm();
    const input = screen.getByLabelText(/price/i);
    expect(input).not.toHaveAttribute('aria-invalid');
  });
});
