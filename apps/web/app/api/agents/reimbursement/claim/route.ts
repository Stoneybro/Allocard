import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { delegations, claimRedemptions, delegationCaveats, users, companies } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { checkPolicy, verifyReceipt } from "@/lib/venice";
import { put } from "@vercel/blob";
import { createWalletClient, http, parseEther, type Hex, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
  getSmartAccountsEnvironment,
  ScopeType,
} from "@metamask/smart-accounts-kit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { claimDescription, amountEth, receiptBase64, companyId, employeeId, agentId } = body;

    if (!claimDescription || !amountEth || !companyId || !employeeId || !agentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Get the Employee
    const employee = await db.query.users.findFirst({
      where: eq(users.id, employeeId),
    });

    if (!employee || !employee.smartAccountAddress) {
      return NextResponse.json({ error: "Employee smart account not found" }, { status: 400 });
    }

    // 2. Look up Company -> Agent delegation
    const delegation = await db.query.delegations.findFirst({
      where: and(
        eq(delegations.delegatorId, companyId),
        eq(delegations.delegateeId, agentId),
        eq(delegations.status, "active")
      ),
    });

    if (!delegation) {
      return NextResponse.json({ error: "No active delegation found for this agent" }, { status: 400 });
    }

    // Load caveats for policy check
    const caveats = await db.query.delegationCaveats.findMany({
      where: eq(delegationCaveats.delegationId, delegation.id),
    });

    const mappedCaveats = caveats.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      caveatValue: c.caveatValue as any
    }));

    // Add policyPrompt if it exists as a fake caveat for summary
    const combinedPolicyCaveats = [...mappedCaveats];
    if (delegation.policyPrompt) {
       // We can just pass the policyPrompt directly to checkPolicy
    }

    // 3. Optional: Upload Receipt to Vercel Blob
    let receiptUrl = null;
    let visionReasoning = "";
    
    if (receiptBase64) {
      try {
        // Upload to Vercel Blob
        // Strip data:image/jpeg;base64,
        const base64Data = receiptBase64.split(',')[1] || receiptBase64;
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = await put(`receipts/${Date.now()}.jpg`, buffer, {
          access: 'public',
        });
        receiptUrl = blob.url;

        // Verify with Venice Vision
        const visionResult = await verifyReceipt({
          imageBase64: base64Data,
          claimDescription,
          amountEth,
        });

        if (!visionResult.verified) {
          return NextResponse.json({ 
            error: "Receipt rejected by AI", 
            veniceApproved: false, 
            veniceReasoning: visionResult.reasoning 
          });
        }
        visionReasoning = `[Vision: Verified receipt for ${visionResult.extractedAmount || '?'} at ${visionResult.extractedMerchant || '?'}] `;
      } catch (err: any) {
        console.error("Receipt processing failed:", err);
        return NextResponse.json({ error: "Failed to process receipt: " + err.message }, { status: 500 });
      }
    }

    // 4. Fetch company policy
    const [company] = await db.select({ companyPolicy: companies.companyPolicy })
      .from(companies).where(eq(companies.id, companyId)).limit(0);
    let companyPolicy: string | null = null;
    if (companyId) {
      const [co] = await db.select({ companyPolicy: companies.companyPolicy })
        .from(companies).where(eq(companies.id, companyId)).limit(1);
      companyPolicy = co?.companyPolicy ?? null;
    }

    // Venice Policy Check
    const policyResult = await checkPolicy({
      claimDescription,
      amountEth,
      caveats: mappedCaveats,
      policyPrompt: delegation.policyPrompt,
      companyPolicy,
    });

    if (!policyResult.approved) {
      // Log rejection
      await db.insert(claimRedemptions).values({
        agentId,
        employeeId,
        companyId,
        claimDescription,
        amountEth,
        receiptUrl,
        venicePrompt: policyResult.prompt,
        veniceApproved: false,
        veniceReasoning: visionReasoning + policyResult.reasoning,
        veniceConfidence: policyResult.confidence,
        status: "rejected",
      });

      return NextResponse.json({ 
        veniceApproved: false, 
        veniceReasoning: visionReasoning + policyResult.reasoning 
      });
    }

    // 5. On-chain Redemption
    const pkey = process.env.AGENTS_PRIVATE_KEY;
    
    if (!pkey) {
      throw new Error("Server missing agent credentials");
    }

    let txHash: string | null = null;
    let finalStatus: "approved" | "failed" = "approved";
    let finalReasoning = visionReasoning + policyResult.reasoning;

    try {
      const account = privateKeyToAccount(pkey.startsWith('0x') ? pkey as Hex : `0x${pkey}`);
      const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
      const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() });
      
      const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL;
      if (!bundlerUrl) throw new Error("Missing NEXT_PUBLIC_BUNDLER_RPC_URL");

      // 5a. Re-create the Reimbursement Agent Smart Account (deterministic salt 1)
      const { toMetaMaskSmartAccount, Implementation, getSmartAccountsEnvironment } = await import("@metamask/smart-accounts-kit");
      const sa = await toMetaMaskSmartAccount({
        client: publicClient as any,
        implementation: Implementation.Hybrid,
        deployParams: [account.address, [], [], []],
        deploySalt: "0x0000000000000000000000000000000000000000000000000000000000000001",
        signer: { walletClient: walletClient as any }
      });

      // 5b. Create Bundler Client
      const { createBundlerClient } = await import("viem/account-abstraction");
      const bundlerClient = createBundlerClient({
        client: publicClient,
        chain: baseSepolia,
        transport: http(bundlerUrl),
      });

      // 5c. Send UserOp
      const env = getSmartAccountsEnvironment(baseSepolia.id);
      const userOpHash = await bundlerClient.sendUserOperation({
        account: sa as any,
        calls: [{
          to: employee.smartAccountAddress as Hex,
          value: parseEther(amountEth),
          data: "0x" as Hex,
          permissionContext: delegation.signedDelegation as Hex,
          delegationManager: env.DelegationManager as Hex,
        }] as any
      });

      const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
      txHash = receipt.receipt.transactionHash;

    } catch (err: any) {
      console.error("Redemption failed:", err);
      finalStatus = "failed";
      finalReasoning = `[On-chain Error] ${err.message}`;
    }

    // 6. Log success/fail in claim_redemptions
    await db.insert(claimRedemptions).values({
      agentId,
      employeeId,
      companyId,
      delegationHash: delegation.delegationHash,
      claimDescription,
      amountEth,
      receiptUrl,
      venicePrompt: policyResult.prompt,
      veniceApproved: true,
      veniceReasoning: finalReasoning,
      veniceConfidence: policyResult.confidence,
      txHash,
      status: finalStatus,
    });

    if (finalStatus === "failed") {
      return NextResponse.json({ error: finalReasoning }, { status: 500 });
    }

    return NextResponse.json({ 
      veniceApproved: true, 
      veniceReasoning: finalReasoning,
      txHash
    });

  } catch (error: any) {
    console.error("Reimbursement claim error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
