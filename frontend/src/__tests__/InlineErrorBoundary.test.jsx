import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import InlineErrorBoundary from '../components/common/InlineErrorBoundary';

const ThrowingChild = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error('Inline render error');
  return <span>Inline content</span>;
};

describe('InlineErrorBoundary', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <InlineErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </InlineErrorBoundary>,
    );
    expect(screen.getByText('Inline content')).toBeInTheDocument();
  });

  it('renders inline fallback when an error is thrown', () => {
    render(
      <InlineErrorBoundary>
        <ThrowingChild shouldThrow />
      </InlineErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows the default fallbackText when none is provided', () => {
    render(
      <InlineErrorBoundary>
        <ThrowingChild shouldThrow />
      </InlineErrorBoundary>,
    );
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows custom fallbackText when provided', () => {
    render(
      <InlineErrorBoundary fallbackText="Price unavailable">
        <ThrowingChild shouldThrow />
      </InlineErrorBoundary>,
    );
    expect(screen.getByText('Price unavailable')).toBeInTheDocument();
  });

  it('shows a retry link when showRetry is true (default)', () => {
    render(
      <InlineErrorBoundary>
        <ThrowingChild shouldThrow />
      </InlineErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('hides the retry link when showRetry is false', () => {
    render(
      <InlineErrorBoundary showRetry={false}>
        <ThrowingChild shouldThrow />
      </InlineErrorBoundary>,
    );
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('clears error state after retry click', () => {
    const { rerender } = render(
      <InlineErrorBoundary>
        <ThrowingChild shouldThrow />
      </InlineErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    rerender(
      <InlineErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </InlineErrorBoundary>,
    );
    expect(screen.getByText('Inline content')).toBeInTheDocument();
  });

  it('calls onError when an error is caught', () => {
    const onError = vi.fn();
    render(
      <InlineErrorBoundary onError={onError}>
        <ThrowingChild shouldThrow />
      </InlineErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
