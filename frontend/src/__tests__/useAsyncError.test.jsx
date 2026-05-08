import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useAsyncError from '../hooks/useAsyncError';
import { ErrorBoundary } from '../components/common';

function AsyncErrorThrower({ triggerError }) {
  const throwToErrorBoundary = useAsyncError();

  React.useEffect(() => {
    if (triggerError) {
      throwToErrorBoundary(new Error('Async operation failed'));
    }
  }, [triggerError, throwToErrorBoundary]);

  return <div>Async component</div>;
}

describe('useAsyncError', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders normally when no async error is triggered', () => {
    render(
      <ErrorBoundary>
        <AsyncErrorThrower triggerError={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Async component')).toBeInTheDocument();
  });

  it('surfaces async error to surrounding ErrorBoundary', async () => {
    render(
      <ErrorBoundary>
        <AsyncErrorThrower triggerError />
      </ErrorBoundary>,
    );
    // ErrorBoundary should catch the re-thrown error from the state setter
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('returns a stable throwToErrorBoundary function reference', () => {
    const refs = [];

    function Capturer() {
      const fn = useAsyncError();
      refs.push(fn);
      return null;
    }

    const { rerender } = render(<Capturer />);
    rerender(<Capturer />);

    expect(refs[0]).toBe(refs[1]);
  });
});
