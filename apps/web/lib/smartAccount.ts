import { publicClient } from './client'
import { createInjectedWalletClient } from './signer'
import { Implementation, toMetaMaskSmartAccount } from '@metamask/smart-accounts-kit'
import type { Hex } from 'viem'

type SmartAccountClient = Parameters<typeof toMetaMaskSmartAccount>[0]['client']
type SmartAccountWalletSigner = Extract<
  NonNullable<Parameters<typeof toMetaMaskSmartAccount>[0]['signer']>,
  { walletClient: unknown }
>

export async function createHybridSmartAccount(
  walletClient = createInjectedWalletClient(),
) {
  const [address] = await walletClient.getAddresses()

  if (!address) {
    throw new Error('No address returned by the injected wallet')
  }

  return toMetaMaskSmartAccount({
    client: publicClient as SmartAccountClient,
    implementation: Implementation.Hybrid,
    deployParams: [address, [], [], []],
    deploySalt: '0x' as Hex,
    signer: {
      walletClient: walletClient as unknown as SmartAccountWalletSigner['walletClient'],
    },
  })
}
