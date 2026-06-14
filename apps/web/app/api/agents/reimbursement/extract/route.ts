import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-guard";
import { extractReceiptData } from "@/lib/venice";

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const { receiptBase64 } = body;

    if (!receiptBase64) {
      return NextResponse.json({ error: "Receipt image is required" }, { status: 400 });
    }

    const extraction = await extractReceiptData({ imageBase64: receiptBase64 });

    return NextResponse.json({ extraction });
  } catch (error: any) {
    console.error("Receipt extraction error:", error);
    return NextResponse.json({ error: error.message || "Extraction failed" }, { status: 500 });
  }
}
