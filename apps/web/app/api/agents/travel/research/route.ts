import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-guard";
import { delegations, delegationCaveats, companies } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { researchTravel } from "@/lib/venice";

export async function POST(req: Request) {
  try {
    await requireSession();
    const { destination, departureDate, returnDate, notes, delegationId } = await req.json();

    if (!delegationId) {
      return NextResponse.json({ error: "No delegation ID provided" }, { status: 400 });
    }

    // 1. Get the delegation to check the budget allowed for the Travel Agent
    const [delegation] = await db
      .select()
      .from(delegations)
      .where(eq(delegations.id, delegationId))
      .limit(1);

    if (!delegation) {
      return NextResponse.json({ error: "Delegation not found" }, { status: 404 });
    }

    const caveatsRows = await db
      .select()
      .from(delegationCaveats)
      .where(eq(delegationCaveats.delegationId, delegationId));

    const mappedCaveats = caveatsRows.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      caveatValue: c.caveatValue as any
    }));
    
    // Find the max amount ETH
    let budgetEth = "0";
    const amountCaveat = mappedCaveats.find(c => c.caveatType === "nativeTokenTransferAmount");
    if (amountCaveat) {
      const val = amountCaveat.caveatValue as any;
      const wei = val.maxAmount || val.amount;
      if (wei) {
        budgetEth = (Number(wei) / 1e18).toString();
      }
    }

    // 2. Fetch company policy
    let companyPolicy: string | null = null;
    if (delegation.delegatorType === "company") {
      const [co] = await db.select({ companyPolicy: companies.companyPolicy })
        .from(companies).where(eq(companies.id, delegation.delegatorId)).limit(1);
      companyPolicy = co?.companyPolicy ?? null;
    }

    // 3. Research options with Venice
    const travelPlan = await researchTravel({
      destination,
      departureDateApprox: departureDate,
      returnDateApprox: returnDate,
      budgetEth,
      caveats: mappedCaveats,
      policyPrompt: delegation.policyPrompt,
      companyPolicy,
      employeeDescription: notes,
    });

    if (!travelPlan.approved) {
       return NextResponse.json({ error: travelPlan.reasoning }, { status: 400 });
    }

    return NextResponse.json({ plan: travelPlan });
  } catch (err: any) {
    console.error("Travel research error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
