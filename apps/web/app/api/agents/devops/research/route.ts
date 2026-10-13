import { NextResponse } from "next/server";
import { parseEther } from "viem";
import { db } from "@/lib/db";
import { requireEmployeeAgentDelegation, requireSessionUser } from "@/lib/auth-guard";
import { delegations, delegationCaveats, agentBookings, companies } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { researchDevOpsProcurement } from "@/lib/ai";
import { getPlan, getSponsorMerchant } from "@/lib/merchants";

export async function POST(req: Request) {
  try {
    const sessionUser = await requireSessionUser();
    const { prompt, targetBudgetAusd, delegationId } = await req.json();

    if (!delegationId) {
      return NextResponse.json({ error: "No delegation ID provided" }, { status: 400 });
    }

    const [delegation] = await db
      .select()
      .from(delegations)
      .where(eq(delegations.id, delegationId))
      .limit(1);

    if (!delegation) {
      return NextResponse.json({ error: "Delegation not found" }, { status: 404 });
    }

    const { parentDelegation } = await requireEmployeeAgentDelegation(sessionUser.id, delegationId);

    const caveatsRows = await db
      .select()
      .from(delegationCaveats)
      .where(eq(delegationCaveats.delegationId, delegationId));

    const mappedCaveats = caveatsRows.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      caveatValue: c.caveatValue as any,
    }));

    // Calculate remaining budget from caveat limit minus agentBookings
    let remainingBudgetAusd = 1000; // default generous upper bound if uncapped
    const amountCaveat = mappedCaveats.find((c) => c.caveatType === "nativeTokenTransferAmount");
    if (amountCaveat) {
      const val = amountCaveat.caveatValue as any;
      const wei = val.maxAmount || val.amount;
      if (wei) {
        const limitUnits = BigInt(wei);
        // Normalize 18 vs 6 decimals
        const limitWei = limitUnits < 10n ** 14n ? limitUnits * 10n ** 12n : limitUnits;

        const [bookingResult] = await db
          .select({
            total: sql<string>`COALESCE(SUM(${agentBookings.amountEth}::numeric), 0)`,
          })
          .from(agentBookings)
          .where(eq(agentBookings.delegationId, delegationId));

        const bookingSpentWei = (() => {
          try {
            return bookingResult?.total ? parseEther(bookingResult.total) : 0n;
          } catch {
            return 0n;
          }
        })();

        const remainingWei = limitWei > bookingSpentWei ? limitWei - bookingSpentWei : 0n;
        remainingBudgetAusd = Math.max(0, Math.floor(Number(remainingWei / 10n ** 18n)));
      }
    }

    // Fetch company expense policy
    let companyPolicy: string | null = null;
    if (parentDelegation.delegatorType === "company") {
      const [co] = await db
        .select({ companyPolicy: companies.companyPolicy })
        .from(companies)
        .where(eq(companies.id, parentDelegation.delegatorId))
        .limit(1);
      companyPolicy = co?.companyPolicy ?? null;
    }

    const recommendation = await researchDevOpsProcurement({
      prompt: prompt || "",
      budgetAusd: remainingBudgetAusd,
      targetBudgetAusd: targetBudgetAusd ? Number(targetBudgetAusd) : null,
      caveats: mappedCaveats,
      companyPolicy,
    });

    const merchant = getSponsorMerchant(recommendation.recommendedMerchantId);
    const plan = getPlan(recommendation.recommendedMerchantId, recommendation.recommendedPlanId);

    return NextResponse.json({
      recommendation,
      merchant,
      plan,
      remainingBudgetAusd,
    });
  } catch (err: any) {
    if (err instanceof Error && (err.message.startsWith("Unauthorized:") || err.message.startsWith("Forbidden:"))) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[/api/agents/devops/research] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Procurement scouring failed" },
      { status: 500 }
    );
  }
}
