import { monadTestnet } from "viem/chains";
import { parseAbi } from "viem";

export const chain = monadTestnet;
export const CHAIN_ID = monadTestnet.id; // 10143
export const CHAIN_NAME = "Monad Testnet";
export const TOKEN_SYMBOL = "AUSD";
export const NATIVE_SYMBOL = "MON";
export const EXPLORER_URL = "https://testnet.monadexplorer.com";

// Agora AUSD on Monad Testnet (Chain ID 10143)
export const AUSD_ADDRESS = "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC" as `0x${string}`;
export const AGORA_FAUCET_ADDRESS = "0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C" as `0x${string}`;
export const AUSD_DECIMALS = 6;
export const FAUCET_DRIP_AMOUNT = "10000";

export const ERC20_ABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
]);

export const AGORA_FAUCET_ABI = parseAbi([
  "function requestFunds(address recipient)",
  "function faucetDripAmount() view returns (uint256)",
  "function maxDripFrequency() view returns (uint256)",
  "function lastDripTimestamp() view returns (uint256)",
]);

export function getTxExplorerUrl(txHash?: string | null): string {
  if (!txHash) return EXPLORER_URL;
  return `${EXPLORER_URL}/tx/${txHash}`;
}

export function getAddressExplorerUrl(address?: string | null): string {
  if (!address) return EXPLORER_URL;
  return `${EXPLORER_URL}/address/${address}`;
}
