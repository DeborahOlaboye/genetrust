import { AppConfig, UserSession } from '@stacks/auth';
import { createReownWagmiConnector } from '@reown/appkit-adapter-wagmi';
import { mainnet, sepolia } from 'wagmi/chains';

// Stacks Configuration
export const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

// App Details
export const appDetails = {
  name: 'GeneTrust',
  icon: typeof window !== 'undefined' ? `${window.location.origin}/logo192.png` : '/logo192.png',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://genetrust.xyz'
};

// Reown Connector Configuration
export const reownConnector = createReownWagmiConnector({
  appName: appDetails.name,
  appIcon: appDetails.icon,
  appUrl: appDetails.url,
  chains: [mainnet, sepolia],
  projectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'YOUR_REOWN_PROJECT_ID'
});

// Wallet Configuration
export const walletConfig = {
  appDetails,
  redirectTo: '/',
  onFinish: () => window.location.reload(),
  userSession,
  connectors: [reownConnector]
};

// Export all configurations
export default {
  appConfig,
  userSession,
  appDetails,
  reownConnector,
  walletConfig
};
