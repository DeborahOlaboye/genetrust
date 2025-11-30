import { walletService } from '../walletService';
import { userSession } from '../../config/walletConfig';

// Mock the userSession and showConnect
jest.mock('../../config/walletConfig', () => ({
  userSession: {
    isUserSignedIn: jest.fn(),
    loadUserData: jest.fn(),
    isSignInPending: jest.fn(),
    handlePendingSignIn: jest.fn(),
    signUserOut: jest.fn(),
    onSignIn: jest.fn(),
    onSignOut: jest.fn(),
  },
  appDetails: {
    name: 'GeneTrust',
    icon: 'https://example.com/icon.png',
  },
}));

jest.mock('@stacks/connect', () => ({
  showConnect: jest.fn(),
  UserSession: jest.fn(),
  AppConfig: jest.fn(),
}));

describe('WalletService', () => {
  let service;
  const mockAddress = 'ST1PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A5';
  const mockUserData = {
    profile: {
      stxAddress: {
        testnet: mockAddress,
        mainnet: 'SP1PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A5',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = walletService;
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

    it('should initialize with address when already signed in', () => {
      userSession.isUserSignedIn.mockReturnValue(true);
      userSession.loadUserData.mockReturnValue(mockUserData);
      
      // Recreate the service to test initialization
      const newService = new (require('../walletService').WalletService)();
      
      expect(newService.getAddress()).toBe(mockAddress);
      expect(newService.isConnected()).toBe(true);
    });
  });

  describe('connectWallet', () => {
    it('should call showConnect with correct parameters', () => {
      const { showConnect } = require('@stacks/connect');
      
      service.connectWallet();
      
      expect(showConnect).toHaveBeenCalledWith({
        userSession: userSession,
        appDetails: {
          name: 'GeneTrust',
          icon: expect.any(String),
        },
        onFinish: expect.any(Function),
        onCancel: expect.any(Function),
      });
    });

    it('should update address and notify listeners on successful connection', () => {
      const { showConnect } = require('@stacks/connect');
      const mockOnFinish = showConnect.mock.calls[0][0].onFinish;
      const listener = jest.fn();
      
      service.addListener(listener);
      mockOnFinish();
      
      expect(listener).toHaveBeenCalledWith(service.getAddress());
    });
  });

  describe('disconnectWallet', () => {
    it('should sign out and update state', async () => {
      // First, set up a connected state
      userSession.isUserSignedIn.mockReturnValue(true);
      userSession.loadUserData.mockReturnValue(mockUserData);
      service._updateAddress();
      
      const listener = jest.fn();
      service.addListener(listener);
      
      await service.disconnectWallet();
      
      expect(userSession.signUserOut).toHaveBeenCalled();
      expect(service.getAddress()).toBeNull();
      expect(service.isConnected()).toBe(false);
      expect(listener).toHaveBeenCalledWith(null);
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
