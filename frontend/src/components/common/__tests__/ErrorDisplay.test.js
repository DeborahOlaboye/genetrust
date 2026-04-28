import React from 'react';
import { render } from '@testing-library/react';
import ErrorDisplay from '../ErrorDisplay';

jest.mock('@mui/material', () => ({
  Alert: ({ severity, children }) => <div data-testid="alert" data-severity={severity}>{children}</div>,
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Typography: ({ children }) => <span>{children}</span>,
  Box: ({ children }) => <div>{children}</div>,
  Collapse: ({ children }) => <div>{children}</div>,
  IconButton: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
}));

jest.mock('@mui/icons-material', () => ({
  Close: () => <span>X</span>,
  Refresh: () => <span>R</span>,
  ReportProblem: () => <span>!</span>,
}));

jest.mock('../../../utils/errorUtils', () => ({
  getUserFriendlyMessage: (e) => e?.message || 'Unknown error',
  ERROR_CODES: {
    AUTH_UNAUTHORIZED: 1001,
    AUTH_SESSION_EXPIRED: 1002,
    AUTH_PERMISSION_DENIED: 1003,
    NETWORK_OFFLINE: 3001,
    NETWORK_TIMEOUT: 3002,
    API_UNAUTHORIZED: 3004,
    API_FORBIDDEN: 3005,
    API_NOT_FOUND: 3006,
    API_SERVER_ERROR: 3007,
    WALLET_NOT_CONNECTED: 4001,
    WALLET_TRANSACTION_REJECTED: 4002,
    WALLET_INSUFFICIENT_BALANCE: 4003,
    WALLET_TRANSACTION_FAILED: 4004,
    WALLET_NETWORK_MISMATCH: 4005,
    RESOURCE_NOT_FOUND: 5001,
    RESOURCE_ALREADY_EXISTS: 5002,
    RESOURCE_LIMIT_REACHED: 5003,
  },
}));

describe('ErrorDisplay — handleRetry', () => {
  it('calls onRetry when Try Again button is clicked', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<ErrorDisplay error={{ message: 'fail' }} onRetry={onRetry} />);
    getByText('Try Again').click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorDisplay — getErrorTitle', () => {
  it('uses custom title prop when provided', () => {
    const { getByText } = render(
      <ErrorDisplay error={{ message: 'fail', code: 3001 }} title="Custom Title" />
    );
    expect(getByText('Custom Title')).toBeTruthy();
  });

  it('derives title from error code when default title is in use', () => {
    const { getByText } = render(<ErrorDisplay error={{ message: 'fail', code: 3001 }} />);
    expect(getByText('Connection Error')).toBeTruthy();
  });
});

describe('ErrorDisplay — showDetails', () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = originalEnv; });

  it('shows expand button when showDetails=true regardless of NODE_ENV', () => {
    process.env.NODE_ENV = 'production';
    const { getByText } = render(
      <ErrorDisplay error={{ message: 'fail', stack: 'stacktrace' }} showDetails />
    );
    expect(getByText('Show Details')).toBeTruthy();
  });
});

describe('ErrorDisplay — getSeverity', () => {
  it('defaults to error severity when no code and no severity prop', () => {
    const { getByTestId } = render(<ErrorDisplay error={{ message: 'oops' }} />);
    expect(getByTestId('alert').dataset.severity).toBe('error');
  });

  it('uses warning severity for NETWORK_OFFLINE', () => {
    const { getByTestId } = render(<ErrorDisplay error={{ message: 'offline', code: 3001 }} />);
    expect(getByTestId('alert').dataset.severity).toBe('warning');
  });

  it('uses info severity for API_NOT_FOUND', () => {
    const { getByTestId } = render(<ErrorDisplay error={{ message: 'not found', code: 3006 }} />);
    expect(getByTestId('alert').dataset.severity).toBe('info');
  });

  it('respects explicit severity prop override', () => {
    const { getByTestId } = render(
      <ErrorDisplay error={{ message: 'offline', code: 3001 }} severity="error" />
    );
    expect(getByTestId('alert').dataset.severity).toBe('error');
  });

  it('uses warning severity for WALLET_NOT_CONNECTED', () => {
    const { getByTestId } = render(<ErrorDisplay error={{ message: 'no wallet', code: 4001 }} />);
    expect(getByTestId('alert').dataset.severity).toBe('warning');
  });

  it('uses info severity for WALLET_TRANSACTION_REJECTED', () => {
    const { getByTestId } = render(<ErrorDisplay error={{ message: 'rejected', code: 4002 }} />);
    expect(getByTestId('alert').dataset.severity).toBe('info');
  });

  it('uses warning severity for AUTH_SESSION_EXPIRED', () => {
    const { getByTestId } = render(<ErrorDisplay error={{ message: 'expired', code: 1002 }} />);
    expect(getByTestId('alert').dataset.severity).toBe('warning');
  });

  it('uses info severity for RESOURCE_NOT_FOUND', () => {
    const { getByTestId } = render(<ErrorDisplay error={{ message: 'missing', code: 5001 }} />);
    expect(getByTestId('alert').dataset.severity).toBe('info');
  });

  it('uses warning severity for WALLET_INSUFFICIENT_BALANCE', () => {
    const { getByTestId } = render(<ErrorDisplay error={{ message: 'no funds', code: 4003 }} />);
    expect(getByTestId('alert').dataset.severity).toBe('warning');
  });

  it('uses error severity for WALLET_TRANSACTION_FAILED', () => {
    const { getByTestId } = render(<ErrorDisplay error={{ message: 'tx failed', code: 4004 }} />);
    expect(getByTestId('alert').dataset.severity).toBe('error');
  });
});
