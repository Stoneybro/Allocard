import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { delegations, delegationCaveats, companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { researchVendor } from "@/lib/venice";

export async function POST(req: Request) {
  try {
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

    // Pass existing tools based on previous bookings maybe? Or hardcoded for MVP context.
    const existingTools = ["Notion", "Figma", "Slack"];

    // 2. Fetch company policy
    let companyPolicy: string | null = null;
    if (delegation.delegatorType === "company") {
      const [co] = await db.select({ companyPolicy: companies.companyPolicy })
        .from(companies).where(eq(companies.id, delegation.delegatorId)).limit(1);
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
    console.error("Procurement research error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
