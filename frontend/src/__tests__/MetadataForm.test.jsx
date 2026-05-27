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

describe('MetadataForm — file summary', () => {
  it('displays the selected file name', () => {
    renderForm();
    expect(screen.getByText('sample.vcf')).toBeInTheDocument();
  });

  it('displays a human-readable file size', () => {
    renderForm({ state: { ...BASE_STATE, fileSize: 1024 } });
    expect(screen.getByText('1 KB')).toBeInTheDocument();
  });
});

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

  it('counter uses amber colour at 160 characters', () => {
    const desc = 'A'.repeat(160);
    renderForm({ state: { ...BASE_STATE, description: desc } });
    const counter = screen.getByLabelText(/160 of 200 characters used/i);
    expect(counter).toHaveStyle({ color: '#F59E0B' });
  });

  it('counter uses red colour at 190 characters', () => {
    const desc = 'A'.repeat(190);
    renderForm({ state: { ...BASE_STATE, description: desc } });
    const counter = screen.getByLabelText(/190 of 200 characters used/i);
    expect(counter).toHaveStyle({ color: '#EF4444' });
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

describe('MetadataForm — access level radiogroup', () => {
  it('renders a radiogroup with the correct accessible label', () => {
    renderForm();
    expect(screen.getByRole('radiogroup', { name: /access level/i })).toBeInTheDocument();
  });

  it('renders three radio options', () => {
    renderForm();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('marks the initially selected level as checked', () => {
    renderForm();
    const basic = screen.getByRole('radio', { name: /basic/i });
    expect(basic).toHaveAttribute('aria-checked', 'true');
  });

  it('marks the non-selected levels as not checked', () => {
    renderForm();
    const detailed = screen.getByRole('radio', { name: /detailed/i });
    const full = screen.getByRole('radio', { name: /full/i });
    expect(detailed).toHaveAttribute('aria-checked', 'false');
    expect(full).toHaveAttribute('aria-checked', 'false');
  });

  it('calls setField with the new access level when a radio is clicked', () => {
    const setField = jest.fn();
    renderForm({ setField });
    fireEvent.click(screen.getByRole('radio', { name: /detailed/i }));
    expect(setField).toHaveBeenCalledWith('accessLevel', 2);
  });

  it('calls setField with the next access level on ArrowRight key', () => {
    const setField = jest.fn();
    renderForm({ setField });
    const basic = screen.getByRole('radio', { name: /basic/i });
    fireEvent.keyDown(basic, { key: 'ArrowRight' });
    expect(setField).toHaveBeenCalledWith('accessLevel', 2);
  });

  it('calls setField with the next access level on ArrowDown key', () => {
    const setField = jest.fn();
    renderForm({ setField });
    const basic = screen.getByRole('radio', { name: /basic/i });
    fireEvent.keyDown(basic, { key: 'ArrowDown' });
    expect(setField).toHaveBeenCalledWith('accessLevel', 2);
  });

  it('calls setField with the previous access level on ArrowLeft key', () => {
    const setField = jest.fn();
    renderForm({ state: { ...BASE_STATE, accessLevel: 2 }, setField });
    const detailed = screen.getByRole('radio', { name: /detailed/i });
    fireEvent.keyDown(detailed, { key: 'ArrowLeft' });
    expect(setField).toHaveBeenCalledWith('accessLevel', 1);
  });

  it('wraps from last to first on ArrowRight', () => {
    const setField = jest.fn();
    renderForm({ state: { ...BASE_STATE, accessLevel: 3 }, setField });
    const full = screen.getByRole('radio', { name: /full/i });
    fireEvent.keyDown(full, { key: 'ArrowRight' });
    expect(setField).toHaveBeenCalledWith('accessLevel', 1);
  });
});
