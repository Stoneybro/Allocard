import { http, createPublicClient } from 'viem'
import { sepolia as chain } from 'viem/chains'

const transport = http()
export const publicClient = createPublicClient({
  transport,
  chain,
})

export async function getPimlicoGasPrice(bundlerUrl: string) {
  const response = await fetch(bundlerUrl, {
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
  return {
    maxFeePerGas: BigInt(data.result.fast.maxFeePerGas),
    maxPriorityFeePerGas: BigInt(data.result.fast.maxPriorityFeePerGas),
  };
}