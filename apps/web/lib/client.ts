import { http, createPublicClient } from 'viem'
import { chain } from './chain'

const transport = http()
export const publicClient = createPublicClient({
  transport,
  chain,
})

import { normalizePimlicoUrl, getPimlicoConfig } from './pimlico'

export { normalizePimlicoUrl, getPimlicoConfig }

export async function getPimlicoGasPrice(bundlerUrl: string) {
  const normalizedUrl = normalizePimlicoUrl(bundlerUrl);
  const response = await fetch(normalizedUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "pimlico_getUserOperationGasPrice",
      params: [],
    }),
  });
  const data = await response.json();
  if (!data?.result?.fast) {
    throw new Error(`Failed to fetch gas price from Pimlico: ${data?.error?.message || JSON.stringify(data)}`);
  }
  return {
    maxFeePerGas: BigInt(data.result.fast.maxFeePerGas),
    maxPriorityFeePerGas: BigInt(data.result.fast.maxPriorityFeePerGas),
  };
}