export function parseUserOpError(err: any): string {
  if (!err) return "Transaction declined: An unknown error occurred.";
  
  const msg = typeof err === "string" ? err : (err.message || err.details || "");
  const lowerMsg = msg.toLowerCase();
  
  // Specific MetaMask Delegation & ERC-7710 On-Chain Caveat Enforcer Patterns
  if (lowerMsg.includes("transferamount") || lowerMsg.includes("exceeds limit") || lowerMsg.includes("amount exceeds") || lowerMsg.includes("lifetime")) {
    return "Card declined: Lifetime spending limit exceeded. The requested amount exceeds your card's total authorized limit.";
  }
  if (lowerMsg.includes("periodtransfer") || lowerMsg.includes("period limit") || lowerMsg.includes("allowance exceeded") || lowerMsg.includes("period")) {
    return "Card declined: Periodic allowance limit reached. You have reached your allocated spending cap for this period.";
  }
  if (lowerMsg.includes("allowedtargets") || lowerMsg.includes("not an allowed target") || lowerMsg.includes("target")) {
    return "Card declined: Unauthorized vendor. Recipient address is not on the company's approved vendor list.";
  }
  if (lowerMsg.includes("valuelte") || lowerMsg.includes("per-transaction") || lowerMsg.includes("value exceeds") || lowerMsg.includes("per transaction")) {
    return "Card declined: Per-transaction cap exceeded. This single expense exceeds the maximum amount permitted per transaction.";
  }
  if (lowerMsg.includes("limitedcalls") || lowerMsg.includes("calls limit")) {
    return "Card declined: Transaction count limit reached. You have used all authorized transactions under this card delegation.";
  }
  if (lowerMsg.includes("redeemer") || lowerMsg.includes("unauthorized redeemer")) {
    return "Card declined: Unauthorized signer. The executing smart account is not permitted to redeem this delegation.";
  }

  // Treasury & Smart Account Errors
  if (lowerMsg.includes("insufficient funds") || lowerMsg.includes("insufficient balance") || lowerMsg.includes("exceeds balance")) {
    return "Card declined: Company treasury account has insufficient funds to fulfill this expense.";
  }
  if (lowerMsg.includes("aa21") || lowerMsg.includes("didn't pay prefund") || lowerMsg.includes("prefund")) {
    return "Card declined: Gas sponsorship unavailable or paymaster limit reached.";
  }
  if (lowerMsg.includes("aa23") || lowerMsg.includes("execution reverted") || lowerMsg.includes("policy enforcer")) {
    return "Card declined: The transaction was rejected by on-chain company expense policy.";
  }
  if (lowerMsg.includes("chainid mismatch")) {
    return "Network configuration mismatch: Bundler/Paymaster RPC endpoint does not match Monad Testnet (10143).";
  }

  // Clean fallback
  if (msg.length > 150) {
    return "Card declined by policy: " + msg.slice(0, 150) + "...";
  }

  return msg || "Transaction declined: The requested spend violated company delegation rules.";
}
