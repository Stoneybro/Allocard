/** Agora Remittance is a company-level program for cross-border contractor payouts. */
export const AGORA_SERVICE_NAME = "Agora Remittance Agent";

export function isAgoraAgent(agent: { name: string } | null | undefined): boolean {
  if (!agent?.name) return false;
  const lower = agent.name.trim().toLowerCase();
  return lower === AGORA_SERVICE_NAME.toLowerCase() || lower.includes("agora");
}

export type AgoraStatus = "not_configured" | "pending" | "ready" | "paused" | "unavailable" | "exhausted";

export type AgoraProgram = {
  status: AgoraStatus;
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

/** Prefer an existing signed budget, then pending config, then revoked */
export function findAgoraDelegation<T extends ProgramDelegation>(
  delegations: T[],
  companyId: string,
  agentId: string | null,
): T | undefined {
  if (!agentId) return undefined;
  const matching = delegations.filter(
    (d) =>
      d.delegatorType === "company" &&
      d.delegatorId === companyId &&
      d.delegateeType === "agent" &&
      d.delegateeId === agentId,
  );
  return (
    matching.find((d) => d.status === "active" && Boolean(d.signedDelegation)) ??
    matching.find((d) => d.status === "pending_config") ??
    matching.find((d) => d.status === "active") ??
    matching.find((d) => d.status === "revoked")
  );
}

export function agoraStatus(
  agentId: string | null,
  delegation: ProgramDelegation | undefined,
): AgoraStatus {
  if (!agentId) return "unavailable";
  if (!delegation) return "not_configured";
  if (delegation.status === "revoked") return "paused";
  return delegation.status === "active" && Boolean(delegation.signedDelegation) ? "ready" : "pending";
}

export function agoraStatusLabel(status: AgoraStatus): string {
  return {
    not_configured: "Pool needed",
    pending: "Setup in progress",
    ready: "Remittances active",
    paused: "Remittances paused",
    unavailable: "Service unavailable",
    exhausted: "Budget used up",
  }[status];
}

export function agoraEmployeeMessage(status: AgoraStatus): string {
  return {
    not_configured: "Your company needs to authorize an Agora Remittance Pool before international invoices can be settled. Ask your employer to set up the pool.",
    pending: "Your employer has started Agora Remittance setup. Invoices can be settled once authorized.",
    ready: "Upload international contractor invoices or remote travel bills. Settled directly in Agora AUSD at live mid-market FX with zero banking wire fees.",
    paused: "Your company has paused cross-border remittances. Ask your employer to authorize a new budget.",
    unavailable: "The Agora remittance service is temporarily unavailable.",
    exhausted: "Your company’s cross-border remittance budget has been exhausted. Ask your employer to authorize a top-up.",
  }[status];
}
