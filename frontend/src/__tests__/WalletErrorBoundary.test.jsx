import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WalletErrorBoundary from '../components/common/WalletErrorBoundary';

function ThrowingChild({ errorMessage }) {
  if (errorMessage) {
    const err = new Error(errorMessage);
    throw err;
  }
  return <div>Wallet content</div>;
}

describe('WalletErrorBoundary', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <WalletErrorBoundary>
        <ThrowingChild errorMessage={null} />
      </WalletErrorBoundary>,
    );
    expect(screen.getByText('Wallet content')).toBeInTheDocument();
  });

  it('shows wallet-specific fallback for wallet rejection errors', () => {
    render(
      <WalletErrorBoundary>
        <ThrowingChild errorMessage="User rejected the wallet connection" />
      </WalletErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Wallet connection failed')).toBeInTheDocument();
  });

  it('shows generic wallet error fallback for non-wallet errors', () => {
    render(
      <WalletErrorBoundary>
        <ThrowingChild errorMessage="Network timeout" />
      </WalletErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Wallet error')).toBeInTheDocument();
  });

  it('renders a Reconnect button in the fallback', () => {
    render(
      <WalletErrorBoundary>
        <ThrowingChild errorMessage="User denied" />
      </WalletErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: /reconnect/i })).toBeInTheDocument();
  });

  it('resets the error state after Reconnect click', () => {
    const { rerender } = render(
      <WalletErrorBoundary>
        <ThrowingChild errorMessage="User rejected" />
      </WalletErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /reconnect/i }));
    rerender(
      <WalletErrorBoundary>
        <ThrowingChild errorMessage={null} />
      </WalletErrorBoundary>,
    );
    expect(screen.getByText('Wallet content')).toBeInTheDocument();
  });

  it('calls onError callback when error is caught', () => {
    const onError = vi.fn();
    render(
      <WalletErrorBoundary onError={onError}>
        <ThrowingChild errorMessage="User rejected" />
      </WalletErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
