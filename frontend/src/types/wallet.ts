import { UserSession } from '@stacks/auth';

export type NetworkType = 'mainnet' | 'testnet';

export interface WalletState {
  isConnected: boolean;
  userSession: UserSession | null;
  userData: {
    profile: {
      stxAddress: {
        mainnet: string;
        testnet: string;
      };
      identityAddress?: string;
      username?: string;
    };
  } | null;
  network: NetworkType;
  balance: {
    stx: string;
    fungibleTokens: Record<string, string>;
    nonFungibleTokens: Record<string, string[]>;
  };
  error: string | null;
  isLoading: boolean;
}

export type ConnectOptions = {
  onFinish?: (payload: { userSession: UserSession; userData: any }) => void;
  onCancel?: () => void;
  userSession?: UserSession;
  redirectTo?: string;
  appDetails?: {
    name: string;
    icon: string;
  };
};

export interface IWalletService {
  connect: (options?: ConnectOptions) => Promise<void>;
  disconnect: () => Promise<void>;
  getBalance: (address: string) => Promise<{
    stx: string;
    fungibleTokens: Record<string, string>;
    nonFungibleTokens: Record<string, string[]>;
  }>;
  transferSTX: (options: {
    recipient: string;
    amount: string;
    memo?: string;
    onFinish?: (txId: string) => void;
    onCancel?: () => void;
  }) => Promise<void>;
  signMessage: (options: {
    message: string;
    onFinish?: (signature: string) => void;
    onCancel?: () => void;
  }) => Promise<void>;
  getAddress: (network?: NetworkType) => string | undefined;
}

export enum WalletActionType {
  CONNECT = 'WALLET_CONNECT',
  CONNECT_SUCCESS = 'WALLET_CONNECT_SUCCESS',
  CONNECT_ERROR = 'WALLET_CONNECT_ERROR',
  DISCONNECT = 'WALLET_DISCONNECT',
  UPDATE_BALANCE = 'WALLET_UPDATE_BALANCE',
  SET_NETWORK = 'WALLET_SET_NETWORK',
  RESET = 'WALLET_RESET',
}

export type WalletAction =
  | { type: WalletActionType.CONNECT }
  | {
      type: WalletActionType.CONNECT_SUCCESS;
      payload: {
        userSession: UserSession;
        userData: any;
      };
    }
  | {
      type: WalletActionType.CONNECT_ERROR;
      payload: string;
    }
  | { type: WalletActionType.DISCONNECT }
  | {
      type: WalletActionType.UPDATE_BALANCE;
      payload: WalletState['balance'];
    }
  | {
      type: WalletActionType.SET_NETWORK;
      payload: NetworkType;
    }
  | { type: WalletActionType.RESET };
