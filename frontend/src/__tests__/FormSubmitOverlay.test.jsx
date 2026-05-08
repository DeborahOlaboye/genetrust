import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FormSubmitOverlay from '../components/common/FormSubmitOverlay';

describe('FormSubmitOverlay', () => {
  it('renders children when isLoading is false', () => {
    render(
      <FormSubmitOverlay isLoading={false}>
        <button>Submit</button>
      </FormSubmitOverlay>,
    );
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders the overlay when isLoading is true', () => {
    render(
      <FormSubmitOverlay isLoading>
        <button>Submit</button>
      </FormSubmitOverlay>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the default message when isLoading is true', () => {
    render(
      <FormSubmitOverlay isLoading>
        <button>Submit</button>
      </FormSubmitOverlay>,
    );
    expect(screen.getByText('Processing…')).toBeInTheDocument();
  });

  it('shows a custom message when provided', () => {
    render(
      <FormSubmitOverlay isLoading message="Creating dataset…">
        <button>Submit</button>
      </FormSubmitOverlay>,
    );
    expect(screen.getByText('Creating dataset…')).toBeInTheDocument();
  });

  it('still renders children when overlay is active', () => {
    render(
      <FormSubmitOverlay isLoading>
        <button>Submit</button>
      </FormSubmitOverlay>,
    );
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('uses aria-live="polite" on the overlay', () => {
    render(
      <FormSubmitOverlay isLoading>
        <button>Submit</button>
      </FormSubmitOverlay>,
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
