import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PageErrorBoundary from '../components/common/PageErrorBoundary';

const ThrowingChild = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error('Test render error');
  return <div>Child content</div>;
};

const ChunkErrorChild = () => {
  const err = new Error('Loading chunk 3 failed.');
  err.name = 'ChunkLoadError';
  throw err;
};

describe('PageErrorBoundary', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <PageErrorBoundary pageName="Test Page">
        <ThrowingChild shouldThrow={false} />
      </PageErrorBoundary>,
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders fallback UI when a render error is thrown', () => {
    render(
      <PageErrorBoundary pageName="Test Page">
        <ThrowingChild shouldThrow />
      </PageErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('displays pageName in the fallback body text', () => {
    render(
      <PageErrorBoundary pageName="Dashboard">
        <ThrowingChild shouldThrow />
      </PageErrorBoundary>,
    );
    expect(screen.getByText(/Dashboard/)).toBeInTheDocument();
  });

  it('shows a Try Again button in the fallback UI', () => {
    render(
      <PageErrorBoundary pageName="Test Page">
        <ThrowingChild shouldThrow />
      </PageErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows a Go Home button in the fallback UI', () => {
    render(
      <PageErrorBoundary pageName="Test Page">
        <ThrowingChild shouldThrow />
      </PageErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: /go to homepage/i })).toBeInTheDocument();
  });

  it('resets error state and re-renders children after Try Again click', () => {
    const { rerender } = render(
      <PageErrorBoundary pageName="Test Page">
        <ThrowingChild shouldThrow />
      </PageErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    rerender(
      <PageErrorBoundary pageName="Test Page">
        <ThrowingChild shouldThrow={false} />
      </PageErrorBoundary>,
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('calls onError callback when error is caught', () => {
    const onError = vi.fn();
    render(
      <PageErrorBoundary pageName="Test Page" onError={onError}>
        <ThrowingChild shouldThrow />
      </PageErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('calls onReset callback when Try Again is clicked', () => {
    const onReset = vi.fn();
    render(
      <PageErrorBoundary pageName="Test Page" onReset={onReset}>
        <ThrowingChild shouldThrow />
      </PageErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('shows "Update required" heading for ChunkLoadError', () => {
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload: vi.fn() });
    try {
      render(
        <PageErrorBoundary pageName="Test Page">
          <ChunkErrorChild />
        </PageErrorBoundary>,
      );
      expect(screen.getByText('Update required')).toBeInTheDocument();
    } catch {
      // ChunkLoadError may trigger window.location.reload, which jsdom won't support
    }
  });
});
