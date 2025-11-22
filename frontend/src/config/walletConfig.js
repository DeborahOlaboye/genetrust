import { createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { createReownWagmiConnector } from '@reown/appkit-adapter-wagmi';

// Configure your app's metadata
const appMetadata = {
  name: 'GeneTrust',
  description: 'Decentralized Genetic Data Marketplace',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://genetrust.xyz',
  icons: ['/logo192.png']
};

// Create Reown connector
const reownConnector = createReownWagmiConnector({
  appName: 'GeneTrust',
  appIcon: '/logo192.png',
  appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://genetrust.xyz',
  chains: [mainnet, sepolia], // Add other chains as needed
  projectId: 'YOUR_PROJECT_ID' // Replace with your Reown project ID
});

// Create wagmi config
export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [reownConnector],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http()
  },
  ssr: true
});

export { reownConnector };
