import { createWalletClient, custom, type EIP1193Provider } from 'viem'
import { baseSepolia as chain } from 'viem/chains'

export function createInjectedWalletClient(account?: `0x${string}`) {
  if (typeof window === 'undefined') {
    throw new Error('Injected wallet client can only be created in the browser')
  
  }

  const injectedWindow = window as Window & {
    ethereum?: EIP1193Provider
  }

  const ethereum = injectedWindow.ethereum

  if (!ethereum) {
    throw new Error('No injected wallet provider found')
  }

  return createWalletClient({
    account,
    chain,
    transport: custom(ethereum),
  })
}
