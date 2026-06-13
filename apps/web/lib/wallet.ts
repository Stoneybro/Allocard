export type WalletAddress = `0x${string}`;

const walletAddressPattern = /^0x[a-fA-F0-9]{40}$/;

export function normalizeWalletAddress(address: string): WalletAddress {
  const normalized = address.trim().toLowerCase();

  if (!walletAddressPattern.test(normalized)) {
    throw new Error("Invalid wallet address");
  }

  return normalized as WalletAddress;
}

export function formatWalletAddress(address: string) {
  const normalized = normalizeWalletAddress(address);

  return `${normalized.slice(0, 6)}…${normalized.slice(-4)}`;
}

export function formatCompanyName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function validateCompanyName(name: string) {
  const formatted = formatCompanyName(name);

  if (formatted.length < 2) {
    throw new Error("Company name must be at least 2 characters");
  }

  if (formatted.length > 80) {
    throw new Error("Company name must be 80 characters or fewer");
  }

  return formatted;
}

export function generateInviteCode() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 16);
}
