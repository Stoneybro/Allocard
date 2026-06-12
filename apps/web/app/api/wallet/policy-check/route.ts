import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { delegationCaveats, delegations, companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { advisoryPolicyCheck } from "@/lib/venice";


export async function POST(req: NextRequest) {
  try {
    const { purpose, amountEth, delegationId } = await req.json();

    if (!purpose || !amountEth || !delegationId) {
      return NextResponse.json(
        { error: "Missing required fields: purpose, amountEth, delegationId" },
        { status: 400 }
      );
    }

    // Fetch caveats for the given delegationId
    const caveatsRows = await db
      .select()
      .from(delegationCaveats)
      .where(eq(delegationCaveats.delegationId, delegationId));

    const caveats = caveatsRows.map(caveat => ({
      id: caveat.id,
      delegationId: caveat.delegationId,
      caveatType: caveat.caveatType,
      caveatValue: caveat.caveatValue,
      createdAt: caveat.createdAt.toISOString(),
    }));

    // Fetch delegation to get companyId and policyPrompt
    const [delegation] = await db
      .select({ delegatorId: delegations.delegatorId, delegatorType: delegations.delegatorType, policyPrompt: delegations.policyPrompt })
      .from(delegations)
      .where(eq(delegations.id, delegationId))
      .limit(1);

    let companyPolicy: string | null = null;
    if (delegation?.delegatorType === "company") {
      const [co] = await db.select({ companyPolicy: companies.companyPolicy })
        .from(companies).where(eq(companies.id, delegation.delegatorId)).limit(1);
      companyPolicy = co?.companyPolicy ?? null;
    }

    // Call Venice AI advisory check
    const result = await advisoryPolicyCheck({
      purpose,
      amountEth,
      caveats,
      policyPrompt: delegation?.policyPrompt ?? null,
      companyPolicy,
    });

    return NextResponse.json({
      isCompliant: result.approved,
      reasoning: result.reasoning,
    });
  } catch (error) {
    console.error("[policy-check] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
