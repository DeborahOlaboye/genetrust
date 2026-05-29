// Test environment setup
// Set up environment variables for tests

process.env.NODE_ENV = 'test';
process.env.REACT_APP_API_URL = 'http://localhost:3001/api';
process.env.REACT_APP_CHAIN_ID = 'testnet';
process.env.REACT_APP_INFURA_PROJECT_ID = 'test-project-id';

// Mock environment variables that might be used in components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));