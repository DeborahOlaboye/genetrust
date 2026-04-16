import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import useWallet, { PROVIDERS } from '../useWallet';

jest.mock('../services/wallet/WalletManager', () => {
  const providers = {
    [PROVIDERS.REOWN]: { name: PROVIDERS.REOWN },
    [PROVIDERS.HIRO]: { name: PROVIDERS.HIRO },
  };

  const mockManager = {
    init: jest.fn().mockResolvedValue(true),
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    getState: jest.fn().mockReturnValue({
      address: null,
      isConnected: false,
      network: null,
      provider: null,
      availableProviders: [PROVIDERS.REOWN, PROVIDERS.HIRO],
    }),
    getProviderStatuses: jest.fn().mockReturnValue([
      { name: PROVIDERS.REOWN, isConnected: false, address: null, network: null },
      { name: PROVIDERS.HIRO, isConnected: false, address: null, network: null },
    ]),
    addListener: jest.fn(callback => {
      callback();
      return () => {};
    }),
  };

  return {
    __esModule: true,
    default: jest.fn(() => mockManager),
    PROVIDERS,
  };
});

describe('useWallet hook', () => {
  function TestComponent() {
    const wallet = useWallet();
    return (
      <div>
        <span data-testid="isConnected">{String(wallet.isConnected)}</span>
        <span data-testid="providerCount">{wallet.providerStatuses.length}</span>
        <span data-testid="availableProviders">{wallet.availableProviders.join(',')}</span>
      </div>
    );
  }

  it('exposes provider metadata through hook state', async () => {
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId('availableProviders')).toHaveTextContent('reown,hiro'));
    expect(screen.getByTestId('providerCount')).toHaveTextContent('2');
    expect(screen.getByTestId('isConnected')).toHaveTextContent('false');
  });
});
