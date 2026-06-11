import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { delegationCaveats } from "@/lib/db/schema";
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

    // Call Venice AI advisory check
    const result = await advisoryPolicyCheck({
      purpose,
      amountEth,
      caveats,
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
