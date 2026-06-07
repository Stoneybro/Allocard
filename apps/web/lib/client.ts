import { http, createPublicClient } from 'viem'
import { baseSepolia as chain } from 'viem/chains'

const transport = http()
export const publicClient = createPublicClient({
  transport,
  chain,
})