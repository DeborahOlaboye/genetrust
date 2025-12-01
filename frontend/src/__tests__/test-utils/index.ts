import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from '../../contexts/AppContext';
import { WalletProvider } from '../../contexts/WalletContext';
import { ThemeProvider } from '../../theme';

// Re-export everything from testing library
export * from '@testing-library/react';

// Custom render function that includes all providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppProvider>
          <WalletProvider>{children}</WalletProvider>
        </AppProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

type CustomRenderOptions = Omit<RenderOptions, 'wrapper'>;

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult => render(ui, { wrapper: AllTheProviders, ...options });

// Mock next/router
export const mockRouter = {
  basePath: '',
  pathname: '/',
  route: '/',
  asPath: '/',
  query: {},
  push: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn().mockResolvedValue(undefined),
  beforePopState: jest.fn(),
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  isFallback: false,
};

// Mock window.ethereum
export const mockEthereum = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  isMetaMask: true,
  isConnected: () => true,
  networkVersion: '1',
  selectedAddress: '0x0000000000000000000000000000000000000000',
};

// Mock window object
export const mockWindow = () => {
  // @ts-ignore
  window.ethereum = mockEthereum;
  // @ts-ignore
  window.web3 = {
    currentProvider: mockEthereum,
  };
};

// Custom matchers
expect.extend({
  toBeInTheDocument: (received) => {
    const pass = document.body.contains(received);
    return {
      pass,
      message: () =>
        `Expected ${received} ${pass ? 'not ' : ''}to be in the document`,
    };
  },
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
    }
  }
}

export { customRender as render };
