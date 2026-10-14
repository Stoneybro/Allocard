import { CHAIN_ID } from "./chain";

/**
 * Normalizes a Pimlico RPC URL so it always targets the active chain (Monad Testnet 10143).
 * If the environment has a Sepolia URL or mismatched chain slug, this function rewrites
 * the URL path to `/v2/${CHAIN_ID}/rpc` while keeping the API key intact.
 */
export function normalizePimlicoUrl(rawUrl?: string): string {
  const fallback = `https://api.pimlico.io/v2/${CHAIN_ID}/rpc?apikey=pim_hTry94xL89FG7zGStsZTca`;
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    return fallback;
  }
  const trimmed = rawUrl.trim();

  // If URL has api.pimlico.io/v2/<chainSlug>/rpc, ensure the chainSlug matches CHAIN_ID
  const pimlicoMatch = trimmed.match(/^(https?:\/\/api\.pimlico\.io\/v2\/)([^/?#]+)(\/rpc.*)?$/i);
  if (pimlicoMatch) {
    const prefix = pimlicoMatch[1];
    const currentChainSlug = pimlicoMatch[2];
    const rest = pimlicoMatch[3] || "/rpc";
    if (currentChainSlug !== String(CHAIN_ID)) {
      return `${prefix}${CHAIN_ID}${rest}`;
    }
  }

  return trimmed;
}

export function getPimlicoConfig() {
  const bundlerUrl = normalizePimlicoUrl(process.env.NEXT_PUBLIC_BUNDLER_RPC_URL);
  const paymasterUrl = normalizePimlicoUrl(process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL);
  const sponsorId = process.env.NEXT_PUBLIC_PIMLICO_SPONSOR_ID?.trim() || "sp_jazzy_hellion";

  return { bundlerUrl, paymasterUrl, sponsorId };
}
