import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { manualTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyReceipt } from "@/lib/venice";

export async function POST(req: NextRequest) {
  try {
    const { txHash, imageBase64, mimeType } = await req.json();

    if (!txHash || !imageBase64) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch the transaction
    const [tx] = await db
      .select()
      .from(manualTransactions)
      .where(eq(manualTransactions.txHash, txHash))
      .limit(1);

    if (!tx) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Call Venice AI to verify receipt
    const verification = await verifyReceipt({
      imageBase64,
      mimeType,
      claimDescription: tx.purpose,
      amountEth: tx.amountEth,
    });

    // We store a summarized receipt string in receiptSummary
    const receiptSummary = verification.verified
      ? `[Verified] ${verification.reasoning}`
      : `[Flagged] ${verification.reasoning}`;

    // Update the database
    await db
      .update(manualTransactions)
      .set({ receiptSummary })
      .where(eq(manualTransactions.txHash, txHash));

    return NextResponse.json({ success: true, verification });
  } catch (error) {
    console.error("[verify-receipt] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
