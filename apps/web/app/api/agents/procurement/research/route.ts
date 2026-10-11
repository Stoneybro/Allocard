import { NextResponse } from "next/server";
import { parseEther } from "viem";
import { db } from "@/lib/db";
import { requireEmployeeAgentDelegation, requireSessionUser } from "@/lib/auth-guard";
import { delegations, delegationCaveats, agentBookings, companies } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { researchVendor } from "@/lib/venice";

export async function POST(req: Request) {
  try {
    const sessionUser = await requireSessionUser();
    const { toolCategory, teamSize, additionalRequirements, delegationId } = await req.json();

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

    const mappedCaveats = caveatsRows.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      caveatValue: c.caveatValue as any
    }));
    
    // Calculate remaining budget from caveat limit minus agentBookings
    let budgetEth = "0";
    const amountCaveat = mappedCaveats.find(c => c.caveatType === "nativeTokenTransferAmount");
    if (amountCaveat) {
      const val = amountCaveat.caveatValue as any;
      const wei = val.maxAmount || val.amount;
      if (wei) {
        const limitWei = BigInt(wei);
        // Sum of agent bookings for this delegation to calculate remaining
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
        budgetEth = (Number(remainingWei) / 1e18).toString();
      }
    }

    // Pass existing tools based on previous bookings maybe? Or hardcoded for MVP context.
    const existingTools = ["Notion", "Figma", "Slack"];

    // 2. Fetch company policy
    let companyPolicy: string | null = null;
    if (parentDelegation.delegatorType === "company") {
      const [co] = await db.select({ companyPolicy: companies.companyPolicy })
        .from(companies).where(eq(companies.id, parentDelegation.delegatorId)).limit(1);
      companyPolicy = co?.companyPolicy ?? null;
    }

    // 3. Research options with Venice
    const vendorChoice = await researchVendor({
      toolCategory,
      teamSize,
      budgetEth,
      caveats: mappedCaveats,
      policyPrompt: delegation.policyPrompt,
      companyPolicy,
      existingTools,
      additionalRequirements,
    });

    if (!vendorChoice.approved) {
       return NextResponse.json({ error: vendorChoice.reasoning }, { status: 400 });
    }

    if (vendorChoice.isDuplicate) {
       return NextResponse.json({ error: `Rejected: Duplicate tool detected. ${vendorChoice.duplicateReason}` }, { status: 400 });
    }

    return NextResponse.json({ choice: vendorChoice });
  } catch (err: any) {
    if (err instanceof Error && (err.message.startsWith("Unauthorized:") || err.message.startsWith("Forbidden:"))) {
      return NextResponse.json({ error: err.message }, { status: err.message.startsWith("Unauthorized:") ? 401 : 403 });
    }
    console.error("Procurement research error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
