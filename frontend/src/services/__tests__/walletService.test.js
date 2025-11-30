import { walletService, WalletService } from '../walletService';
import { userSession, appDetails } from '../../config/walletConfig';
import { showConnect } from '@stacks/connect';

// Mock the userSession and showConnect
jest.mock('../../config/walletConfig', () => {
  const originalModule = jest.requireActual('../../config/walletConfig');
  return {
    ...originalModule,
    userSession: {
      isUserSignedIn: jest.fn(),
      loadUserData: jest.fn(),
      isSignInPending: jest.fn(),
      handlePendingSignIn: jest.fn(),
      signUserOut: jest.fn(),
      onSignIn: jest.fn(),
      onSignOut: jest.fn(),
    },
  };
});

jest.mock('@stacks/connect', () => ({
  showConnect: jest.fn(),
  UserSession: jest.fn(),
  AppConfig: jest.fn(),
}));

describe('WalletService', () => {
  let service;
  const mockAddress = 'ST1PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A5';
  const mockMainnetAddress = 'SP1PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A5';
  const mockUserData = {
    profile: {
      stxAddress: {
        testnet: mockAddress,
        mainnet: mockMainnetAddress,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a fresh instance for each test
    service = new WalletService();
    // Reset the singleton instance for testing
    service._address = null;
    service._listeners = new Set();
  });

  describe('Initialization', () => {
    it('should initialize with no address when not signed in', () => {
      userSession.isUserSignedIn.mockReturnValue(false);
      expect(service.getAddress()).toBeNull();
      expect(service.isConnected()).toBe(false);
    });

    it('should initialize with testnet address when already signed in', () => {
      userSession.isUserSignedIn.mockReturnValue(true);
      userSession.loadUserData.mockReturnValue(mockUserData);
      
      const newService = new WalletService();
      
      expect(newService.getAddress()).toBe(mockAddress);
      expect(newService.isConnected()).toBe(true);
    });

    it('should use mainnet address when testnet address is not available', () => {
      userSession.isUserSignedIn.mockReturnValue(true);
      const mainnetOnlyData = {
        profile: {
          stxAddress: {
            mainnet: mockMainnetAddress
          }
        }
      };
      userSession.loadUserData.mockReturnValue(mainnetOnlyData);
      
      const newService = new WalletService();
      
      expect(newService.getAddress()).toBe(mockMainnetAddress);
      expect(newService.isConnected()).toBe(true);
    });

    it('should handle missing stxAddress gracefully', () => {
      userSession.isUserSignedIn.mockReturnValue(true);
      const noAddressData = { profile: {} };
      userSession.loadUserData.mockReturnValue(noAddressData);
      
      const newService = new WalletService();
      
      expect(newService.getAddress()).toBeNull();
      expect(newService.isConnected()).toBe(false);
    });
  });

  describe('connect', () => {
    const originalWindow = global.window;
    
    beforeEach(() => {
      delete global.window;
      global.window = { location: { origin: 'http://test.com' } };
    });

    afterEach(() => {
      global.window = originalWindow;
    });

    it('should call showConnect with correct parameters', async () => {
      const mockResolve = jest.fn();
      const mockReject = jest.fn();
      const mockPromise = new Promise((resolve, reject) => {
        mockResolve.mockImplementation(resolve);
        mockReject.mockImplementation(reject);
      });
      
      showConnect.mockImplementation(({ onFinish }) => {
        onFinish();
        return mockPromise;
      });
      
      userSession.isUserSignedIn.mockReturnValue(true);
      userSession.loadUserData.mockReturnValue(mockUserData);
      
      await service.connect();
      
      expect(showConnect).toHaveBeenCalledWith({
        appDetails: {
          ...appDetails,
          name: 'GeneTrust',
          icon: 'http://test.com/favicon.svg',
        },
        redirectTo: '/',
        onFinish: expect.any(Function),
        onCancel: expect.any(Function),
        userSession: userSession
      });
    });

    it('should resolve with address on successful connection', async () => {
      showConnect.mockImplementation(({ onFinish }) => {
        onFinish();
        return Promise.resolve();
      });
      userSession.isUserSignedIn.mockReturnValue(true);
      userSession.loadUserData.mockReturnValue(mockUserData);
      
      const address = await service.connect();
      expect(address).toBe(mockAddress);
      expect(service.getAddress()).toBe(mockAddress);
    });

    it('should reject when user is not signed in after connection', async () => {
      showConnect.mockImplementation(({ onFinish }) => {
        onFinish();
        return Promise.resolve();
      });
      userSession.isUserSignedIn.mockReturnValue(false);
      
      await expect(service.connect()).rejects.toThrow('User did not sign in');
    });

    it('should reject when user cancels connection', async () => {
      showConnect.mockImplementation(({ onCancel }) => {
        onCancel();
        return Promise.reject();
      });
      
      await expect(service.connect()).rejects.toThrow('User cancelled connection');
    });

    it('should throw error in non-browser environment', async () => {
      const originalWindow = global.window;
      delete global.window;
      
      await expect(service.connect()).rejects.toThrow('Wallet can only be connected in the browser environment');
      
      global.window = originalWindow;
    });
  });

  describe('disconnect', () => {
    it('should sign out and update state', () => {
      // First, set up a connected state
      userSession.isUserSignedIn.mockReturnValue(true);
      userSession.loadUserData.mockReturnValue(mockUserData);
      service._updateAddress();
      
      const listener = jest.fn();
      service.addListener(listener);
      
      service.disconnect();
      
      expect(userSession.signUserOut).toHaveBeenCalledWith('/');
      expect(service.getAddress()).toBeNull();
      expect(service.isConnected()).toBe(false);
      expect(listener).toHaveBeenCalledWith(null);
    });

    it('should handle sign out when not connected', () => {
      service.disconnect();
      expect(userSession.signUserOut).toHaveBeenCalledWith('/');
    });
  });

  describe('_updateAddress', () => {
    it('should update address when user is signed in', () => {
      userSession.isUserSignedIn.mockReturnValue(true);
      userSession.loadUserData.mockReturnValue(mockUserData);
      
      service._updateAddress();
      
      expect(service.getAddress()).toBe(mockAddress);
    });

    it('should set address to null when user is not signed in', () => {
      userSession.isUserSignedIn.mockReturnValue(false);
      service._address = 'some-address';
      
      service._updateAddress();
      
      expect(service.getAddress()).toBeNull();
    });
  });

  describe('listeners', () => {
    it('should add and remove listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      const removeListener1 = service.addListener(listener1);
      const removeListener2 = service.addListener(listener2);
      
      // Test that listeners are called
      service._emit();
      expect(listener1).toHaveBeenCalledWith(service.getAddress());
      expect(listener2).toHaveBeenCalledWith(service.getAddress());
      
      // Remove first listener
      removeListener1();
      
      // Reset mocks and test again
      listener1.mockClear();
      listener2.mockClear();
      
      service._emit();
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith(service.getAddress());
      
      // Remove second listener
      removeListener2();
      
      // Test that no listeners are called
      listener2.mockClear();
      service._emit();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('onChange', () => {
    it('should be an alias for addListener', () => {
      const listener = jest.fn();
      const removeListener = service.onChange(listener);
      
      service._emit();
      expect(listener).toHaveBeenCalledWith(service.getAddress());
      
      // Cleanup
      removeListener();
    });
  });

  describe('Event Listeners', () => {
    it('should add and remove event listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      const remove1 = service.addListener(listener1);
      const remove2 = service.addListener(listener2);
      
      // Trigger an update
      service._updateAddress();
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      
      // Remove first listener
      remove1();
      
      // Reset mocks and trigger update again
      listener1.mockClear();
      listener2.mockClear();
      service._updateAddress();
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      
      // Remove second listener
      remove2();
      
      // Reset mocks and trigger update again
      listener1.mockClear();
      listener2.mockClear();
      service._updateAddress();
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in listeners', () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      service.addListener(errorListener);
      service._updateAddress();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in wallet listener:', expect.any(Error));
      
      // Clean up
      consoleErrorSpy.mockRestore();
    });
  });
});
