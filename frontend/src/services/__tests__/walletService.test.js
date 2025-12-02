import { walletService, WalletService } from '../walletService';
import { userSession, appDetails } from '../../config/walletConfig';
import { showConnect } from '@stacks/connect';

// Mock the userSession and showConnect
const mockUserSession = {
  isUserSignedIn: jest.fn(),
  loadUserData: jest.fn(),
  isSignInPending: jest.fn(),
  handlePendingSignIn: jest.fn(),
  signUserOut: jest.fn(),
  onSignIn: jest.fn(),
  onSignOut: jest.fn(),
};

jest.mock('../../config/walletConfig', () => {
  const originalModule = jest.requireActual('../../config/walletConfig');
  return {
    ...originalModule,
    userSession: mockUserSession,
  };
});

const mockShowConnect = jest.fn();

jest.mock('@stacks/connect', () => ({
  showConnect: (...args) => mockShowConnect(...args),
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
    // Reset the singleton instance
    walletService._address = null;
    walletService._listeners = new Set();
  });

  afterEach(() => {
    // Clean up any remaining listeners
    service._listeners.clear();
    walletService._listeners.clear();
    jest.restoreAllMocks();
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
    let originalWindow;
    
    beforeEach(() => {
      originalWindow = global.window;
      delete global.window;
      global.window = { location: { origin: 'http://test.com' } };
      
      // Reset mocks
      mockShowConnect.mockClear();
      userSession.isUserSignedIn.mockClear();
      userSession.loadUserData.mockClear();
    });

    afterEach(() => {
      if (originalWindow) {
        global.window = originalWindow;
      } else {
        delete global.window;
      }
    });

    it('should call showConnect with correct parameters', async () => {
      // Setup mock implementation
      let onFinishCallback;
      mockShowConnect.mockImplementation(({ onFinish }) => {
        onFinishCallback = onFinish;
        return Promise.resolve();
      });
      
      // Mock user session
      userSession.isUserSignedIn.mockReturnValue(true);
      userSession.loadUserData.mockReturnValue(mockUserData);
      
      // Start the connection
      const connectPromise = service.connect();
      
      // Verify showConnect was called with correct parameters
      expect(mockShowConnect).toHaveBeenCalledWith({
        appDetails: {
          ...appDetails,
          name: 'GeneTrust',
          icon: 'http://test.com/favicon.svg',
        },
        redirectTo: '/',
        onFinish: expect.any(Function),
        onCancel: expect.any(Function),
        userSession: service.userSession,
      });
      
      // Simulate successful connection
      onFinishCallback();
      
      // Wait for the connect promise to resolve
      await expect(connectPromise).resolves.toBe(mockAddress);
      
      // Verify the service state was updated
      expect(service.getAddress()).toBe(mockAddress);
      expect(service.isConnected()).toBe(true);
    });
    
    it('should reject with error when not in browser environment', async () => {
      // Remove window object to simulate non-browser environment
      delete global.window;
      
      await expect(service.connect()).rejects.toThrow(
        'Wallet can only be connected in the browser environment'
      );
    });
    
    it('should resolve immediately if already connected', async () => {
      // Set up initial connected state
      service._address = mockAddress;
      
      const result = await service.connect();
      
      expect(result).toBe(mockAddress);
      expect(mockShowConnect).not.toHaveBeenCalled();
    });
    
    it('should handle user cancellation', async () => {
      let onCancelCallback;
      
      mockShowConnect.mockImplementation(({ onCancel }) => {
        onCancelCallback = onCancel;
        return Promise.reject(new Error('User cancelled'));
      });
      
      userSession.isUserSignedIn.mockReturnValue(false);
      
      const connectPromise = service.connect();
      
      // Simulate user cancellation
      if (onCancelCallback) onCancelCallback();
      
      await expect(connectPromise).rejects.toThrow('User cancelled connection');
      expect(service.isConnected()).toBe(false);
    });
    
    it('should handle sign in failure', async () => {
      mockShowConnect.mockImplementation(({ onFinish }) => {
        onFinish();
        return Promise.resolve();
      });
      
      userSession.isUserSignedIn.mockReturnValue(false);
      
      await expect(service.connect()).rejects.toThrow('User did not sign in');
      expect(service.isConnected()).toBe(false);
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
    it('should sign out and update state', async () => {
      // Set up a connected state
      userSession.isUserSignedIn.mockReturnValue(true);
      userSession.loadUserData.mockReturnValue(mockUserData);
      
      // Create a new service instance to trigger initialization
      const connectedService = new WalletService();
      expect(connectedService.isConnected()).toBe(true);
      
      // Set up listeners
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const unsubscribe1 = connectedService.addListener(listener1);
      connectedService.addListener(listener2);
      
      // Perform disconnect
      connectedService.disconnect();
      
      // Verify sign out was called with correct parameters
      expect(userSession.signUserOut).toHaveBeenCalledTimes(1);
      expect(userSession.signUserOut).toHaveBeenCalledWith('/');
      
      // Verify state was updated
      expect(connectedService.getAddress()).toBeNull();
      expect(connectedService.isConnected()).toBe(false);
      
      // Verify all listeners were called with null
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener1).toHaveBeenCalledWith(null);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledWith(null);
      
      // Test unsubscribing a listener
      listener1.mockClear();
      listener2.mockClear();
      unsubscribe1();
      
      // Trigger another disconnect (should only call remaining listener)
      connectedService.disconnect();
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledWith(null);
    });
    
    it('should handle case when userSession is not available', () => {
      // Save original userSession
      const originalUserSession = service.userSession;
      service.userSession = null;
      
      // Set up a listener
      const listener = jest.fn();
      service.addListener(listener);
      
      // This should not throw and should still clear the address
      service._address = mockAddress; // Set a mock address
      expect(() => service.disconnect()).not.toThrow();
      expect(service.getAddress()).toBeNull();
      expect(listener).toHaveBeenCalledWith(null);
      
      // Restore userSession
      service.userSession = originalUserSession;
    });
    
    it('should handle errors during sign out gracefully', () => {
      // Set up a connected state
      userSession.isUserSignedIn.mockReturnValue(true);
      userSession.signUserOut.mockImplementation(() => {
        throw new Error('Sign out failed');
      });
      
      // Set up a listener
      const listener = jest.fn();
      service.addListener(listener);
      
      // This should not throw
      expect(() => service.disconnect()).not.toThrow();
      
      // State should still be updated even if sign out fails
      expect(service.getAddress()).toBeNull();
      expect(service.isConnected()).toBe(false);
      
      // Listener should still be called
      expect(listener).toHaveBeenCalledWith(null);
    });
  });

  describe('Listener Management', () => {
    it('should add and notify listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      const removeListener1 = service.addListener(listener1);
      const removeListener2 = service.addListener(listener2);
      
      // Simulate address update
      service._address = mockAddress;
      service._emit();
      
      expect(listener1).toHaveBeenCalledWith(mockAddress);
      expect(listener2).toHaveBeenCalledWith(mockAddress);
      
      // Test removing a listener
      removeListener1();
      
      // Update and notify again
      service._address = mockMainnetAddress;
      service._emit();
      
      expect(listener1).toHaveBeenCalledTimes(1); // Should not be called again
      expect(listener2).toHaveBeenCalledWith(mockMainnetAddress);
    });
    
    it('should handle errors in listeners gracefully', () => {
      const error = new Error('Test error');
      const badListener = jest.fn().mockImplementation(() => {
        throw error;
      });
      const goodListener = jest.fn();
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      service.addListener(badListener);
      service.addListener(goodListener);
      
      // This should not throw
      service._emit();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in wallet listener:', error);
      expect(goodListener).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
    
    it('should throw when adding non-function listener', () => {
      expect(() => service.addListener('not a function')).toThrow('Listener must be a function');
      expect(() => service.addListener(123)).toThrow('Listener must be a function');
      expect(() => service.addListener(null)).toThrow('Listener must be a function');
    });
  });
  
  describe('onChange Alias', () => {
    it('should be an alias for addListener', () => {
      const listener = jest.fn();
      const removeListener = service.onChange(listener);
      
      service._address = mockAddress;
      service._emit();
      
      expect(listener).toHaveBeenCalledWith(mockAddress);
      expect(removeListener).toBeInstanceOf(Function);
    });
  });
  
  describe('listeners', () => {
    describe('addListener', () => {
      it('should add a listener and call it on address changes', () => {
        const listener = jest.fn();
        const removeListener = service.addListener(listener);
        
        // Verify initial call with null
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(null);
        
        // Update address and verify listener is called
        service._address = 'test-address';
        service._emit();
        
        expect(listener).toHaveBeenCalledTimes(2);
        expect(listener).toHaveBeenLastCalledWith('test-address');
        
        // Remove the listener
        removeListener();
        
        // Update address again
        service._address = 'another-address';
        service._emit();
        
        // Listener should not be called again after removal
        expect(listener).toHaveBeenCalledTimes(2);
      });
      
      it('should throw an error if listener is not a function', () => {
        expect(() => service.addListener(null)).toThrow('Listener must be a function');
        expect(() => service.addListener('not-a-function')).toThrow('Listener must be a function');
        expect(() => service.addListener({})).toThrow('Listener must be a function');
      });
      
      it('should handle errors in listeners gracefully', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        const badListener = () => {
          throw new Error('Listener error');
        };
        
        const goodListener = jest.fn();
        
        // Add both listeners
        service.addListener(badListener);
        service.addListener(goodListener);
        
        // Trigger emit - should not throw
        expect(() => {
          service._address = 'test';
          service._emit();
        }).not.toThrow();
        
        // Both listeners should have been called
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error in wallet listener:', expect.any(Error));
        expect(goodListener).toHaveBeenCalledWith('test');
        
        consoleErrorSpy.mockRestore();
      });
    });
    
    describe('onChange', () => {
      it('should be an alias for addListener', () => {
        // Mock the addListener method
        const originalAddListener = service.addListener;
        const mockAddListener = jest.fn();
        service.addListener = mockAddListener;
        
        const listener = jest.fn();
        service.onChange(listener);
        
        expect(mockAddListener).toHaveBeenCalledWith(listener);
        
        // Restore original method
        service.addListener = originalAddListener;
      });
    });
    
    describe('_emit', () => {
      it('should call all listeners with the current address', () => {
        const listener1 = jest.fn();
        const listener2 = jest.fn();
        
        service.addListener(listener1);
        service.addListener(listener2);
        
        // Set an address and emit
        service._address = 'test-address';
        service._emit();
        
        expect(listener1).toHaveBeenCalledWith('test-address');
        expect(listener2).toHaveBeenCalledWith('test-address');
        
        // Update address and emit again
        service._address = 'new-address';
        service._emit();
        
        // Should be called twice (once on add, once on emit)
        expect(listener1).toHaveBeenCalledTimes(2);
        expect(listener1).toHaveBeenLastCalledWith('new-address');
        expect(listener2).toHaveBeenCalledTimes(2);
        expect(listener2).toHaveBeenLastCalledWith('new-address');
      });
      
      it('should not throw if there are no listeners', () => {
        // Clear any existing listeners
        service._listeners.clear();
        
        // This should not throw
        expect(() => service._emit()).not.toThrow();
      });
    });
  });  

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(walletService).toBeInstanceOf(WalletService);
      expect(walletService).toBe(service);
    });
  });
  
  describe('_updateAddress', () => {
    it('should update address from user session', () => {
      userSession.isUserSignedIn.mockReturnValue(true);
      userSession.loadUserData.mockReturnValue(mockUserData);
      
      service._updateAddress();
      
      expect(service.getAddress()).toBe(mockAddress);
      expect(userSession.loadUserData).toHaveBeenCalled();
    });
    
    it('should handle missing user data gracefully', () => {
      userSession.isUserSignedIn.mockReturnValue(true);
      userSession.loadUserData.mockReturnValue(null);
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
