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
  },
}));

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
});
