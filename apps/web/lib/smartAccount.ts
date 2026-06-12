import { publicClient } from './client'
import { Implementation, toMetaMaskSmartAccount } from '@metamask/smart-accounts-kit'
import { type Hex, type WalletClient } from 'viem'
import { baseSepolia } from 'viem/chains'

type SmartAccountClient = Parameters<typeof toMetaMaskSmartAccount>[0]['client']
type SmartAccountWalletSigner = Extract<
  NonNullable<Parameters<typeof toMetaMaskSmartAccount>[0]['signer']>,
  { walletClient: unknown }
>

export async function createHybridSmartAccount(
  walletClient: WalletClient,
  ownerAddress?: `0x${string}`,
) {
  if (!walletClient) {
    throw new Error('Wallet client is not available. The wallet may still be connecting. Please wait and try again.')
  }

  const address = ownerAddress ?? (await walletClient.getAddresses())[0]

  if (!address) {
    throw new Error('No address returned by the injected wallet')
  }

  // Wagmi's useWalletClient might return a client still on the default network
  // (e.g. Ethereum Sepolia) if the user's cached Web3Auth session hasn't updated.
  // We override the chain property to explicitly force Base Sepolia.
  const forcedBaseSepoliaClient = {
    ...walletClient,
    chain: baseSepolia,
  }

  return toMetaMaskSmartAccount({
    client: publicClient as SmartAccountClient,
    implementation: Implementation.Hybrid,
    deployParams: [address, [], [], []],
    deploySalt: '0x' as Hex,
    signer: {
      walletClient: forcedBaseSepoliaClient as unknown as SmartAccountWalletSigner['walletClient'],
    },
  })
}
