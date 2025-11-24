import { AppConfig, UserSession } from '@stacks/auth';
import { createReownClient } from '@reown/appkit';

// Note: Removed wagmi/chains import as we'll use Stacks chain configuration

// Stacks Configuration
export const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

// App Details
export const appDetails = {
  name: 'GeneTrust',
  icon: typeof window !== 'undefined' ? `${window.location.origin}/logo192.png` : '/logo192.png',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://genetrust.xyz'
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
