'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider, createConfig } from '@privy-io/wagmi'
import { http } from 'viem'
import { sepolia } from 'viem/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
})

export default function Web3Providers({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(() => new QueryClient())
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim()

  if (!privyAppId || privyAppId.length !== 25) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-6 text-[#111]">
        <section className="max-w-lg rounded-lg border border-[#eaeaea] p-6">
          <h1 className="text-lg font-semibold">Sign-in setup required</h1>
          <p className="mt-2 text-sm text-[#666]">
            Set NEXT_PUBLIC_PRIVY_APP_ID to the 25-character app ID from your Privy dashboard, then restart the development server.
          </p>
        </section>
      </main>
    )
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ['google', 'email'],
        defaultChain: sepolia,
        supportedChains: [sepolia],
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider
          config={wagmiConfig}
          setActiveWalletForWagmi={({ wallets }) =>
            wallets.find((wallet) => wallet.walletClientType === 'privy')
          }
        >
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  )
}
