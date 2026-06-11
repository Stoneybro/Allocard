import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { manualTransactions } from "@/lib/db/schema";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

export async function POST(req: NextRequest) {
  try {
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
    console.error("[wallet-spend] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
