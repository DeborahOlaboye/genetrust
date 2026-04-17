import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WalletSelector from '../WalletSelector';
import { useWalletContext } from '../../contexts/WalletContext';

jest.mock('../../contexts/WalletContext', () => ({
  useWalletContext: jest.fn(),
}));

const mockedUseWalletContext = useWalletContext;

describe('WalletSelector', () => {
  const addAccount = jest.fn();
  const switchAccount = jest.fn();
  const connectLedger = jest.fn().mockResolvedValue('SP1TESTADDRESS999999999999999999999999999');
  const disconnect = jest.fn();
  const connect = jest.fn();

  beforeEach(() => {
    addAccount.mockClear();
    switchAccount.mockClear();
    connectLedger.mockClear();
    disconnect.mockClear();
    connect.mockClear();

    mockedUseWalletContext.mockReturnValue({
      address: 'SP1TESTADDRESS999999999999999999999999999',
      isConnected: true,
      isLoading: false,
      accounts: [
        {
          address: 'SP1TESTADDRESS999999999999999999999999999',
          label: 'Primary Account',
          source: 'imported',
        },
      ],
      activeIndex: 0,
      switchAccount,
      addAccount,
      connectLedger,
      isLedgerConnected: false,
      connect,
      disconnect,
    });
  });

  it('opens the account listbox and exposes option roles for each account', async () => {
    render(<WalletSelector />);

    const trigger = screen.getByRole('button', { name: /SP1TESTADDRESS/ });
    await userEvent.click(trigger);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option')).toBeInTheDocument();
    expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true');
  });

  it('closes the dropdown when Escape is pressed', async () => {
    render(<WalletSelector />);

    await userEvent.click(screen.getByRole('button', { name: /SP1TESTADDRESS/ }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows a validation error for invalid imported addresses', async () => {
    render(<WalletSelector />);

    await userEvent.click(screen.getByRole('button', { name: /SP1TESTADDRESS/ }));
    await userEvent.click(screen.getByRole('button', { name: /\+ Import Address/i }));

    const addressInput = screen.getByPlaceholderText(/Stacks address/i);
    await userEvent.type(addressInput, 'not-a-stacks-address');

    await userEvent.click(screen.getByRole('button', { name: /Import/i }));

    expect(screen.getByText(/Enter a valid Stacks address/i)).toBeInTheDocument();
    expect(addAccount).not.toHaveBeenCalled();
  });
});
