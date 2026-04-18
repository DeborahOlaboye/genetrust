import { AppConfig, UserSession } from '@stacks/auth';
import { createReownClient } from '../utils/reownClientStub';

// Note: Removed wagmi/chains import as we'll use Stacks chain configuration

// Stacks Configuration
export const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

// App Details
const APP_URL = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://genetrust.xyz');

export const appDetails = {
  name: import.meta.env.VITE_APP_NAME || 'GeneTrust',
  icon: `${APP_URL}/logo192.png`,
  url: APP_URL,
};

// Reown Client Configuration
export const reownClient = createReownClient({
  appName: appDetails.name,
  appIcon: appDetails.icon,
  appUrl: appDetails.url,
  // Using Stacks mainnet by default
  network: 'mainnet', // or 'testnet' for testnet
  // Optional: Add any additional configuration needed by Reown
  // projectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID
});

// Wallet Configuration
export const walletConfig = {
  appDetails,
  redirectTo: '/',
  onFinish: () => window.location.reload(),
  userSession
  // Removed reownConnector since we're using reownClient directly
};

// Export all configurations
export default {
  appConfig,
  userSession,
  appDetails,
  reownClient, // Exporting reownClient instead of reownConnector
  walletConfig
};
