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

describe('MetadataForm — description field', () => {
  it('renders the description textarea', () => {
    renderForm();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('shows character counter with current length and max', () => {
    renderForm();
    expect(screen.getByText(`${BASE_STATE.description.length}/200`)).toBeInTheDocument();
  });

  it('shows the minimum length hint when there is no description error', () => {
    renderForm();
    expect(screen.getByText(/minimum.*characters required/i)).toBeInTheDocument();
  });

  it('shows descriptionError inline when fieldErrors.description is set', () => {
    const errMsg = 'Description must be at least 10 characters.';
    renderForm({ fieldErrors: { ...EMPTY_ERRORS, description: errMsg } });
    expect(screen.getByText(errMsg)).toBeInTheDocument();
  });

  it('marks textarea as aria-invalid when descriptionError is set', () => {
    renderForm({ fieldErrors: { ...EMPTY_ERRORS, description: 'Too short.' } });
    const textarea = screen.getByLabelText(/description/i);
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not mark textarea as aria-invalid when there is no error', () => {
    renderForm();
    const textarea = screen.getByLabelText(/description/i);
    expect(textarea).not.toHaveAttribute('aria-invalid');
  });
});

describe('MetadataForm — storage URL field', () => {
  it('renders the storage URL input', () => {
    renderForm();
    expect(screen.getByLabelText(/storage url/i)).toBeInTheDocument();
  });

  it('shows the auto-generate hint when there is no storageUrl error', () => {
    renderForm();
    expect(screen.getByText(/auto-generate/i)).toBeInTheDocument();
  });

  it('shows storageUrlError inline when fieldErrors.storageUrl is set', () => {
    const errMsg = 'Storage URL must start with ipfs:// or https://.';
    renderForm({ fieldErrors: { ...EMPTY_ERRORS, storageUrl: errMsg } });
    expect(screen.getByText(errMsg)).toBeInTheDocument();
  });

  it('marks storage URL input as aria-invalid when storageUrlError is set', () => {
    renderForm({ fieldErrors: { ...EMPTY_ERRORS, storageUrl: 'Bad URL.' } });
    const input = screen.getByLabelText(/storage url/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not mark storage URL input as aria-invalid when there is no error', () => {
    renderForm();
    const input = screen.getByLabelText(/storage url/i);
    expect(input).not.toHaveAttribute('aria-invalid');
  });
});

describe('MetadataForm — submit and back buttons', () => {
  it('renders a submit button with default label', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /register dataset on the blockchain/i })).toBeInTheDocument();
  });

  it('shows Processing label and is disabled while submitting', () => {
    renderForm({ submitting: true });
    const btn = screen.getByRole('button', { name: /registering dataset/i });
    expect(btn).toBeDisabled();
  });

  it('marks submit button as aria-busy while submitting', () => {
    renderForm({ submitting: true });
    const btn = screen.getByRole('button', { name: /registering dataset/i });
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('renders back button with descriptive aria-label', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /back to file selection/i })).toBeInTheDocument();
  });

  it('disables back button while submitting', () => {
    renderForm({ submitting: true });
    const backBtn = screen.getByRole('button', { name: /back to file selection/i });
    expect(backBtn).toBeDisabled();
  });

  it('calls onSubmit when submit button is clicked', () => {
    const onSubmit = jest.fn();
    renderForm({ onSubmit });
    fireEvent.click(screen.getByRole('button', { name: /register dataset on the blockchain/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = jest.fn();
    renderForm({ onBack });
    fireEvent.click(screen.getByRole('button', { name: /back to file selection/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
