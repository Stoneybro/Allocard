import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { formatUnits, parseUnits } from "viem";
import { db } from "@/lib/db";
import { agents, agentBookings, delegationCaveats, delegations } from "@/lib/db/schema";
import { AUSD_DECIMALS } from "@/lib/chain";
import {
  AGORA_SERVICE_NAME,
  findAgoraDelegation,
  agoraStatus,
  type AgoraProgram,
} from "./shared";

/** Internal loader. Callers must first authorize access to this company. */
export async function loadAgoraProgram(companyId: string) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.name, AGORA_SERVICE_NAME), eq(agents.isActive, true)))
    .limit(1);

  const rows = agent
    ? await db
        .select()
        .from(delegations)
        .where(
          and(
            eq(delegations.delegatorType, "company"),
            eq(delegations.delegatorId, companyId),
            eq(delegations.delegateeType, "agent"),
            eq(delegations.delegateeId, agent.id),
          ),
        )
    : [];

  const delegation = findAgoraDelegation(rows, companyId, agent?.id ?? null);
  const program: AgoraProgram = {
    status: agoraStatus(agent?.id ?? null, delegation),
    agentId: agent?.id ?? null,
    delegationId: delegation?.id ?? null,
    remainingAmount: null,
  };

  const caveats = delegation
    ? await db
        .select()
        .from(delegationCaveats)
        .where(eq(delegationCaveats.delegationId, delegation.id))
    : [];

  const limit = caveats.find(
    (c) => c.caveatType === "nativeTokenTransferAmount" || (c.caveatType as string) === "erc20TransferAmount",
  );

  if (program.status === "ready" && delegation?.id && limit) {
    const value = limit.caveatValue as Record<string, unknown>;
    const limitUnits = BigInt(String(value.maxAmount ?? value.amount ?? "0"));

    // Track total spent from agentBookings for this delegation
    const [spent] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${agentBookings.amountEth}::numeric), 0)`,
      })
      .from(agentBookings)
      .where(
        and(
          eq(agentBookings.companyId, companyId),
          eq(agentBookings.delegationId, delegation.id),
        ),
      );

    const spentUnits = parseUnits(spent?.total ?? "0", AUSD_DECIMALS);
    const remaining = limitUnits > spentUnits ? limitUnits - spentUnits : 0n;
    program.remainingAmount = formatUnits(remaining, AUSD_DECIMALS);
    if (remaining <= 0n) program.status = "exhausted";
  }

  return { program, agent, delegation, caveats };
}
