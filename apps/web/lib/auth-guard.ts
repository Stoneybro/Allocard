import { getSessionWalletAddress } from "@/lib/session";

/**
 * Verifies the session cookie and returns the authenticated wallet address.
 * Throws if there is no valid session — use this at the top of every
 * protected API route and server action.
 */
export async function requireSession(): Promise<string> {
  const walletAddress = await getSessionWalletAddress();
  if (!walletAddress) {
    throw new Error("Unauthorized: no valid session. Please connect your wallet.");
  }
  return walletAddress;
}
