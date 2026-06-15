export function parseUserOpError(err: any): string {
  if (!err) return "An unknown error occurred.";
  
  const msg = typeof err === "string" ? err : (err.message || err.details || "");
  
  // Convert to lowercase for easier matching, but keep original for fallback
  const lowerMsg = msg.toLowerCase();
  
  // Delegation Toolkit & On-Chain Caveat Error Patterns
  if (lowerMsg.includes("transferamount") || lowerMsg.includes("exceeds limit") || lowerMsg.includes("amount exceeds")) {
    return "Transaction blocked: Spending limit exceeded.";
  }
  if (lowerMsg.includes("periodtransfer") || lowerMsg.includes("period limit") || lowerMsg.includes("allowance exceeded")) {
    return "Transaction blocked: Time-period allowance exceeded.";
  }
  if (lowerMsg.includes("allowedtargets") || lowerMsg.includes("not an allowed target")) {
    return "Transaction blocked: Recipient is not an allowed target.";
  }
  if (lowerMsg.includes("valuelte") || lowerMsg.includes("per-transaction") || lowerMsg.includes("value exceeds")) {
    return "Transaction blocked: Per-transaction cap exceeded.";
  }
  if (lowerMsg.includes("redeemer") || lowerMsg.includes("unauthorized redeemer")) {
    return "Transaction blocked: Unauthorized redeemer address.";
  }
  if (lowerMsg.includes("limitedcalls") || lowerMsg.includes("calls limit")) {
    return "Transaction blocked: Maximum number of transactions exceeded.";
  }

  // Standard ERC-4337 / Bundler errors
  if (lowerMsg.includes("aa21 didn't pay prefund")) {
    return "Transaction blocked: Smart account has insufficient funds to pay for gas.";
  }
  if (lowerMsg.includes("aa23 reverted") || lowerMsg.includes("execution reverted")) {
    return "Transaction blocked: Execution reverted due to strict policy restrictions.";
  }
  if (lowerMsg.includes("useroperation rejected") || lowerMsg.includes("useroperation reverted")) {
    return "Transaction blocked: The operation was rejected by the policy enforcer.";
  }

  // If the error is still a massive unparsed string, truncate it safely
  if (msg.length > 120) {
    return "Transaction error: " + msg.substring(0, 117) + "...";
  }

  return msg || "An unknown error occurred during transaction execution.";
}
