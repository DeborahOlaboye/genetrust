import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary';

// Mock analytics service
jest.mock('../../services/analytics/analyticsService', () => ({
  trackError: jest.fn(),
}));

// Component that throws an error
const ErrorComponent = () => {
  throw new Error('Test error');
};

// Component that throws an error on button click
const ErrorOnClickComponent = () => {
  const [shouldError, setShouldError] = React.useState(false);

  if (shouldError) {
    throw new Error('Button triggered error');
  }

  return (
    <button onClick={() => setShouldError(true)}>
      Trigger Error
    </button>
  );
};

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('catches and displays error UI when child throws', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary onError={onError}>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );

    consoleSpy.mockRestore();
  });

  it('allows resetting the error state', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(
      <ErrorBoundary>
        <ErrorOnClickComponent />
      </ErrorBoundary>
    );

    // Trigger error
    await user.click(screen.getByText('Trigger Error'));

    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Reset error
    await user.click(screen.getByText('Try Again'));

    // Should show normal content again
    expect(screen.getByText('Trigger Error')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('calls onReset callback when reset occurs', async () => {
    const user = userEvent.setup();
    const onReset = jest.fn();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary onReset={onReset}>
        <ErrorOnClickComponent />
      </ErrorBoundary>
    );

    await user.click(screen.getByText('Trigger Error'));
    await user.click(screen.getByText('Try Again'));

    expect(onReset).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('focuses reset button when error occurs', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    const resetButton = screen.getByText('Try Again');
    expect(resetButton).toHaveFocus();

    consoleSpy.mockRestore();
  });

  it('uses custom error message', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary errorMessage="Custom error message">
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('can hide reset button', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary showReset={false}>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('renders custom fallback component', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const CustomFallback = ({ error, reset }) => (
      <div data-testid="custom-fallback">
        Custom: {error.message}
        <button onClick={reset}>Reset</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom: Test error')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('has proper accessibility attributes', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(alert).toHaveAttribute('aria-atomic', 'true');

    consoleSpy.mockRestore();
  });
});