/** Reimbursement is a company feature; its legacy agent record is execution infrastructure. */
export const REIMBURSEMENT_SERVICE_NAME = "Reimbursement Agent";

export function isReimbursementAgent(agent: { name: string } | null | undefined): boolean {
  return agent?.name.trim().toLowerCase() === REIMBURSEMENT_SERVICE_NAME.toLowerCase();
}

export type ReimbursementStatus = "not_configured" | "pending" | "ready" | "paused" | "unavailable" | "exhausted";

export type ReimbursementProgram = {
  status: ReimbursementStatus;
  agentId: string | null;
  delegationId: string | null;
  remainingAmount: string | null;
};

type ProgramDelegation = {
  id: string;
  delegatorType: string;
  delegatorId: string;
  delegateeType: string;
  delegateeId: string | null;
  status: string;
  signedDelegation: unknown;
};

/** Prefer an existing signed budget, then an unfinished setup, then a revoked budget. */
export function findReimbursementDelegation<T extends ProgramDelegation>(
  delegations: T[], companyId: string, agentId: string | null,
): T | undefined {
  if (!agentId) return undefined;
  const matching = delegations.filter(d =>
    d.delegatorType === "company" && d.delegatorId === companyId &&
    d.delegateeType === "agent" && d.delegateeId === agentId,
  );
  return matching.find(d => d.status === "active" && Boolean(d.signedDelegation))
    ?? matching.find(d => d.status === "pending_config")
    ?? matching.find(d => d.status === "active")
    ?? matching.find(d => d.status === "revoked");
}

export function reimbursementStatus(
  agentId: string | null, delegation: ProgramDelegation | undefined,
): ReimbursementStatus {
  if (!agentId) return "unavailable";
  if (!delegation) return "not_configured";
  if (delegation.status === "revoked") return "paused";
  return delegation.status === "active" && Boolean(delegation.signedDelegation) ? "ready" : "pending";
}

export function reimbursementStatusLabel(status: ReimbursementStatus): string {
  return {
    not_configured: "Budget needed",
    pending: "Setup in progress",
    ready: "Payouts enabled",
    paused: "Payouts paused",
    unavailable: "Service unavailable",
    exhausted: "Budget used up",
  }[status];
}

export function reimbursementEmployeeMessage(status: ReimbursementStatus): string {
  return {
    not_configured: "Your company needs to authorize a reimbursement budget before claims can be paid. Ask your employer to open Reimbursements and set up the budget.",
    pending: "Your employer has started reimbursement setup. Claims can be submitted once the budget is authorized.",
    ready: "Upload a receipt and explain the business expense. Approved claims are paid from your company’s reimbursement budget, separately from your spending allowance.",
    paused: "Your company has paused reimbursement payouts. Ask your employer to authorize a new budget in Reimbursements.",
    unavailable: "The reimbursement service is temporarily unavailable. Your company’s administrator can check the service configuration.",
    exhausted: "Your company’s reimbursement budget has been used up. Ask your employer to authorize a new budget before submitting a claim.",
  }[status];
}
