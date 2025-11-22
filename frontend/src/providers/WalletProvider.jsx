'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { config } from '../config/walletConfig';
import { createReownClient } from '@reown/appkit';
import { useEffect, useState } from 'react';

// Create a client for React Query
const queryClient = new QueryClient();

// Create Reown client
const reownClient = createReownClient({
  appName: process.env.NEXT_PUBLIC_REOWN_APP_NAME || 'GeneTrust',
  appIcon: process.env.NEXT_PUBLIC_REOWN_APP_ICON || '/logo192.png',
  appUrl: process.env.NEXT_PUBLIC_REOWN_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://genetrust.xyz'),
  connectors: config.connectors,
  autoConnect: true,
  chains: config.chains,
  ssr: true
});

export function WalletProvider({ children }) {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration issues
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export { reownClient };
