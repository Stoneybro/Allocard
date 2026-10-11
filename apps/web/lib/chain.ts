import { monadTestnet } from "viem/chains";

export const chain = monadTestnet;
export const CHAIN_ID = monadTestnet.id; // 10143
export const CHAIN_NAME = "Monad Testnet";
export const TOKEN_SYMBOL = "MON";
export const EXPLORER_URL = "https://testnet.monadexplorer.com";

export function getTxExplorerUrl(txHash?: string | null): string {
  if (!txHash) return EXPLORER_URL;
  return `${EXPLORER_URL}/tx/${txHash}`;
}

export function getAddressExplorerUrl(address?: string | null): string {
  if (!address) return EXPLORER_URL;
  return `${EXPLORER_URL}/address/${address}`;
}
