'use client'

import { Web3AuthProvider } from '@web3auth/modal/react'
import { WagmiProvider } from '@web3auth/modal/react/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import web3AuthContextConfig from '@/context/Web3AuthContext'
import { useState } from 'react'

/**
 * Web3Providers wraps children with all required providers for MetaMask
 * Embedded Wallets (formerly Web3Auth). Must be a Client Component.
 *
 * Provider order (outermost → innermost) matches the official docs:
 *  Web3AuthProvider → QueryClientProvider → WagmiProvider
 */
export default function Web3Providers({
  children,
}: {
  children: React.ReactNode
}) {
  // QueryClient is created once per component mount to avoid re-creation on
  // every render while still being isolated per-user in SSR scenarios.
  const [queryClient] = useState(() => new QueryClient())

  return (
    <Web3AuthProvider config={web3AuthContextConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider>{children}</WagmiProvider>
      </QueryClientProvider>
    </Web3AuthProvider>
  )
}
