import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { mockWindow, mockEthereum } from './factories';

// Mock window.ethereum and other globals
mockWindow();

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = window.ResizeObserver || ResizeObserverStub;

// Mock IntersectionObserver
class IntersectionObserverStub {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = window.IntersectionObserver || IntersectionObserverStub;

// Mock scrollTo
window.scrollTo = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock fetch
const mockFetch = (response: any, ok = true) => {
  global.fetch = jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    })
  );
};

// Mock Web3 provider
const mockWeb3Provider = {
  enable: jest.fn(),
  send: jest.fn(),
  sendAsync: jest.fn(),
  request: jest.fn(),
};

// Add custom matchers
expect.extend({
  toBeInTheDocument: (received) => {
    const pass = document.body.contains(received);
    return {
      pass,
      message: () =>
        `Expected ${received} ${pass ? 'not ' : ''}to be in the document`,
    };
  },
  toHaveTextContent: (received, expected) => {
    const text = received.textContent || '';
    const pass = text.includes(expected);
    return {
      pass,
      message: () =>
        `Expected element ${pass ? 'not ' : ''}to have text content "${expected}", but got "${text}"`,
    };
  },
});

// Clean up after each test
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

// Mock console methods during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress expected error messages in test output
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    // Ignore React's act() warnings
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Not implemented: window.alert')
    ) {
      return;
    }
    originalConsoleError(...args);
  });

  jest.spyOn(console, 'warn').mockImplementation((...args) => {
    // Ignore React's act() warnings
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
        args[0].includes('componentWillUpdate'))
    ) {
      return;
    }
    originalConsoleWarn(...args);
  });
});

afterAll(() => {
  // Restore original console methods
  jest.restoreAllMocks();
});

// Export mocks and utilities
export { mockFetch, mockWeb3Provider, mockEthereum };
