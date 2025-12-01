import { faker } from '@faker-js/faker';
import { WalletState, WalletAction } from '../../types/wallet';

type Overrides = Partial<WalletState>;

export const createTestWalletState = (overrides: Overrides = {}): WalletState => ({
  isConnected: faker.datatype.boolean(),
  userSession: {
    isUserSignedIn: jest.fn().mockReturnValue(true),
    loadUserData: jest.fn().mockReturnValue({
      profile: {
        stxAddress: {
          mainnet: faker.finance.ethereumAddress(),
          testnet: faker.finance.ethereumAddress(),
        },
        identityAddress: faker.finance.ethereumAddress(),
        username: faker.internet.userName(),
      },
    }),
    isSignInPending: jest.fn().mockReturnValue(false),
    handlePendingSignIn: jest.fn(),
    signUserOut: jest.fn(),
    onSignIn: jest.fn(),
    onSignOut: jest.fn(),
  },
  userData: {
    profile: {
      stxAddress: {
        mainnet: faker.finance.ethereumAddress(),
        testnet: faker.finance.ethereumAddress(),
      },
      identityAddress: faker.finance.ethereumAddress(),
      username: faker.internet.userName(),
    },
  },
  network: faker.helpers.arrayElement(['mainnet', 'testnet']),
  balance: {
    stx: faker.finance.amount(0, 1000, 6),
    fungibleTokens: {
      [faker.finance.ethereumAddress()]: faker.finance.amount(0, 1000, 6),
    },
    nonFungibleTokens: {
      [faker.finance.ethereumAddress()]: [
        faker.datatype.hexadecimal({ length: 10 }),
      ],
    },
  },
  error: null,
  isLoading: false,
  ...overrides,
});

export const createTestWalletAction = (
  type: WalletAction['type'],
  payload?: any
): WalletAction => {
  switch (type) {
    case 'WALLET_CONNECT_SUCCESS':
      return {
        type,
        payload: {
          userSession: {
            isUserSignedIn: jest.fn().mockReturnValue(true),
            loadUserData: jest.fn().mockReturnValue({
              profile: {
                stxAddress: {
                  mainnet: faker.finance.ethereumAddress(),
                  testnet: faker.finance.ethereumAddress(),
                },
              },
            }),
          },
          userData: {
            profile: {
              stxAddress: {
                mainnet: faker.finance.ethereumAddress(),
                testnet: faker.finance.ethereumAddress(),
              },
            },
          },
        },
      };
    case 'WALLET_UPDATE_BALANCE':
      return {
        type,
        payload: {
          stx: faker.finance.amount(0, 1000, 6),
          fungibleTokens: {},
          nonFungibleTokens: {},
        },
      };
    case 'WALLET_SET_NETWORK':
      return {
        type,
        payload: faker.helpers.arrayElement(['mainnet', 'testnet']),
      };
    case 'WALLET_CONNECT_ERROR':
      return {
        type,
        payload: faker.lorem.sentence(),
      };
    default:
      return { type } as WalletAction;
  }
};

// Mock data generators
export const generateMockTransaction = (overrides = {}) => ({
  txId: faker.datatype.hexadecimal({ length: 64 }),
  sender: faker.finance.ethereumAddress(),
  recipient: faker.finance.ethereumAddress(),
  amount: faker.finance.amount(0, 1000, 6),
  fee: faker.finance.amount(0, 1, 6),
  status: faker.helpers.arrayElement(['pending', 'success', 'failed']),
  timestamp: faker.date.recent().toISOString(),
  memo: faker.lorem.sentence(),
  ...overrides,
});

export const generateMockBlock = (overrides = {}) => ({
  height: faker.datatype.number({ min: 1, max: 1000000 }),
  hash: faker.datatype.hexadecimal({ length: 64 }),
  timestamp: faker.date.recent().toISOString(),
  transactions: Array(faker.datatype.number({ min: 0, max: 10 }))
    .fill(null)
    .map(() => generateMockTransaction()),
  ...overrides,
});

// Mock API responses
export const mockApiResponse = <T>(data: T, status = 200, ok = true) => ({
  ok,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data),
  clone: function () {
    return { ...this };
  },
});

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
