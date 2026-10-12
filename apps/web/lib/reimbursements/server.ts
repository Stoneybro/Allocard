import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { formatEther, parseEther } from "viem";
import { db } from "@/lib/db";
import { agents, claimRedemptions, delegationCaveats, delegations } from "@/lib/db/schema";
import {
  REIMBURSEMENT_SERVICE_NAME,
  findReimbursementDelegation,
  reimbursementStatus,
  type ReimbursementProgram,
} from "./shared";

/** Internal loader. Callers must first authorize access to this company. */
export async function loadReimbursementProgram(companyId: string) {
  const [agent] = await db.select().from(agents).where(and(
    eq(agents.name, REIMBURSEMENT_SERVICE_NAME), eq(agents.isActive, true),
  )).limit(1);
  const rows = agent ? await db.select().from(delegations).where(and(
    eq(delegations.delegatorType, "company"), eq(delegations.delegatorId, companyId),
    eq(delegations.delegateeType, "agent"), eq(delegations.delegateeId, agent.id),
  )) : [];
  const delegation = findReimbursementDelegation(rows, companyId, agent?.id ?? null);
  const program: ReimbursementProgram = {
    status: reimbursementStatus(agent?.id ?? null, delegation),
    agentId: agent?.id ?? null,
    delegationId: delegation?.id ?? null,
    remainingAmount: null,
  };
  const caveats = delegation ? await db.select().from(delegationCaveats)
    .where(eq(delegationCaveats.delegationId, delegation.id)) : [];
  const limit = caveats.find(c => c.caveatType === "nativeTokenTransferAmount");
  if (program.status === "ready" && delegation?.delegationHash && limit) {
    const value = limit.caveatValue as Record<string, unknown>;
    const limitWei = BigInt(String(value.maxAmount ?? value.amount ?? "0"));
    const [spent] = await db.select({ total: sql<string>`COALESCE(SUM(${claimRedemptions.amountEth}::numeric), 0)` })
      .from(claimRedemptions).where(and(
        eq(claimRedemptions.companyId, companyId),
        eq(claimRedemptions.delegationHash, delegation.delegationHash),
        eq(claimRedemptions.status, "approved"),
      ));
    const remainingWei = limitWei - parseEther(spent?.total ?? "0");
    program.remainingAmount = formatEther(remainingWei > 0n ? remainingWei : 0n);
    if (remainingWei <= 0n) program.status = "exhausted";
  }
  return { program, agent, delegation, caveats };
}
