import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployeeCompany, requireSessionUser } from "@/lib/auth-guard";
import { delegationCaveats, delegations, companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { advisoryPolicyCheck } from "@/lib/venice";


export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
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

    const [ownedDelegation] = await db.select().from(delegations).where(eq(delegations.id, delegationId)).limit(1);
    if (
      !delegation || !ownedDelegation || ownedDelegation.status !== "active" || !ownedDelegation.signedDelegation ||
      ownedDelegation.delegatorType !== "company" || ownedDelegation.delegatorId !== delegation.delegatorId ||
      ownedDelegation.delegateeType !== "user" || ownedDelegation.delegateeId !== user.id
    ) {
      return NextResponse.json({ error: "Active employee delegation not found" }, { status: 403 });
    }
    await requireEmployeeCompany(user.id, ownedDelegation.delegatorId);

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
    if (error instanceof Error && (error.message.startsWith("Unauthorized:") || error.message.startsWith("Forbidden:"))) {
      return NextResponse.json({ error: error.message }, { status: error.message.startsWith("Unauthorized:") ? 401 : 403 });
    }
    console.error("[policy-check] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
