import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorDisplay from './ErrorDisplay';

jest.mock('../../utils/errorUtils', () => ({
  getUserFriendlyMessage: jest.fn((error) => error?.message || 'Unknown error'),
  ERROR_CODES: {
    NETWORK_OFFLINE: 'NETWORK_OFFLINE',
    API_UNAUTHORIZED: 'API_UNAUTHORIZED',
    API_FORBIDDEN: 'API_FORBIDDEN',
    API_NOT_FOUND: 'API_NOT_FOUND',
    API_SERVER_ERROR: 'API_SERVER_ERROR',
    WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
    WALLET_TRANSACTION_REJECTED: 'WALLET_TRANSACTION_REJECTED',
  }
}));

describe('ErrorDisplay Component', () => {
  it('renders title and message for a generic error', () => {
    render(
      <ErrorDisplay error={{ message: 'Test error' }} />
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders a specific title for known error codes', () => {
    render(
      <ErrorDisplay error={{ code: 'NETWORK_OFFLINE', message: 'No connection' }} />
    );

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText('No connection')).toBeInTheDocument();
  });

  it('renders retry button and handles retry callback', () => {
    const onRetry = jest.fn();
    render(
      <ErrorDisplay error={{ message: 'Retry me' }} onRetry={onRetry} />
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render the retry button when showRetry is false', () => {
    render(
      <ErrorDisplay error={{ message: 'No retry' }} showRetry={false} />
    );

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('renders error code when provided', () => {
    render(
      <ErrorDisplay error={{ code: 404, message: 'Not found' }} />
    );

    expect(screen.getByText(/Error code: 404/)).toBeInTheDocument();
  });
});