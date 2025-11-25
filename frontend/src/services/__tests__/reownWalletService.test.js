import { reownWalletService } from '../reownWalletService';
import { userSession } from '../../config/walletConfig';
import { ErrorCodes } from '../../utils/errorHandler';

// Mock the userSession
jest.mock('../../config/walletConfig', () => ({
  userSession: {
    isUserSignedIn: jest.fn(),
    loadUserData: jest.fn(),
    signUserOut: jest.fn(),
  },
}));

describe('ReownWalletService', () => {
  let service;
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    service = reownWalletService;
    // Reset the singleton instance for testing
    service._address = null;
    service._isInitialized = false;
    service._listeners = new Set();
  });

  describe('init()', () => {
    it('should initialize the service', async () => {
      userSession.isUserSignedIn.mockReturnValue(false);
      
      await service.init();
      
      expect(service._isInitialized).toBe(true);
      expect(userSession.isUserSignedIn).toHaveBeenCalled();
    });
    
    it('should update address if user is already signed in', async () => {
      const mockAddress = 'ST1PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A5';
      userSession.isUserSignedIn.mockReturnValue(true);
      userSession.loadUserData.mockReturnValue({
        profile: {
          stxAddress: {
            testnet: mockAddress,
            mainnet: 'SP1PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A5',
          },
        },
      });
      
      await service.init();
      
      expect(service._isInitialized).toBe(true);
      expect(service._address).toBe(mockAddress);
    });
  });

  describe('connect()', () => {
    beforeEach(() => {
      // Mock the reownClient.showConnect
      window.reownClient = {
        showConnect: jest.fn(({ onFinish }) => {
          onFinish();
          return Promise.resolve();
        }),
      };
    });

    it('should connect wallet successfully', async () => {
      const mockAddress = 'ST1PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A5';
      userSession.isUserSignedIn.mockReturnValue(false);
      userSession.loadUserData.mockReturnValue({
        profile: {
          stxAddress: {
            testnet: mockAddress,
            mainnet: 'SP1PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A5',
          },
        },
      });

      const address = await service.connect();
      
      expect(address).toBe(mockAddress);
      expect(service._address).toBe(mockAddress);
      expect(window.reownClient.showConnect).toHaveBeenCalled();
    });

    it('should throw error when connection is cancelled', async () => {
      window.reownClient.showConnect = jest.fn(({ onCancel }) => {
        onCancel();
        return Promise.reject(new Error('User cancelled'));
      });
      
      await expect(service.connect()).rejects.toThrow('User cancelled connection');
    });
  });

  describe('disconnect()', () => {
    it('should disconnect wallet successfully', async () => {
      const mockAddress = 'ST1PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A5';
      service._address = mockAddress;
      
      await service.disconnect();
      
      expect(service._address).toBeNull();
      expect(userSession.signUserOut).toHaveBeenCalled();
    });
  });

  describe('listeners', () => {
    it('should add and remove listeners', () => {
      const mockListener = jest.fn();
      
      // Add listener
      const removeListener = service.addListener(mockListener);
      expect(service._listeners.size).toBe(1);
      
      // Emit and check if listener is called
      service._address = 'test-address';
      service._emit();
      expect(mockListener).toHaveBeenCalledWith('test-address');
      
      // Remove listener
      removeListener();
      expect(service._listeners.size).toBe(0);
    });
  });

  describe('isConnected()', () => {
    it('should return true when wallet is connected', () => {
      service._address = 'test-address';
      expect(service.isConnected()).toBe(true);
    });
    
    it('should return false when wallet is not connected', () => {
      service._address = null;
      expect(service.isConnected()).toBe(false);
    });
  });
});
