import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployeeCompany, requireSessionUser } from "@/lib/auth-guard";
import { delegations, manualTransactions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const {
      companyId,
      employeeId,
      delegationId,
      toAddress,
      amountEth,
      purpose,
      isFlagged,
      txHash,
    } = await req.json();

    if (!companyId || !employeeId || !delegationId || !toAddress || !amountEth || !purpose || !txHash) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (employeeId !== user.id) {
      return NextResponse.json({ error: "You can only record your own transactions" }, { status: 403 });
    }
    await requireEmployeeCompany(user.id, companyId);

    const [delegation] = await db
      .select({ id: delegations.id })
      .from(delegations)
      .where(and(
        eq(delegations.id, delegationId),
        eq(delegations.delegatorType, "company"),
        eq(delegations.delegatorId, companyId),
        eq(delegations.delegateeType, "user"),
        eq(delegations.delegateeId, user.id),
        eq(delegations.status, "active"),
      ))
      .limit(1);
    if (!delegation) {
      return NextResponse.json({ error: "Active company delegation not found" }, { status: 403 });
    }

    // Insert the manual transaction into the database
    const [inserted] = await db
      .insert(manualTransactions)
      .values({
        companyId,
        employeeId,
        delegationId,
        toAddress,
        amountEth: amountEth.toString(),
        purpose,
        isFlagged,
        txHash,
      })
      .returning();

    return NextResponse.json({ success: true, transaction: inserted });
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith("Unauthorized:") || error.message.startsWith("Forbidden:"))) {
      return NextResponse.json({ error: error.message }, { status: error.message.startsWith("Unauthorized:") ? 401 : 403 });
    }
    console.error("[wallet-spend] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
