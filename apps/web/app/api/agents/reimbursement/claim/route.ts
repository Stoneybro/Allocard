import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPimlicoGasPrice, getPimlicoConfig } from "@/lib/client";
import { requireEmployeeCompany, requireSessionUser } from "@/lib/auth-guard";
import { claimRedemptions, employeeProfiles, companies } from "@/lib/db/schema";
import { loadReimbursementProgram } from "@/lib/reimbursements/server";
import { reimbursementEmployeeMessage } from "@/lib/reimbursements/shared";
import { TOKEN_SYMBOL } from "@/lib/chain";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { checkPolicy, verifyReceipt } from "@/lib/ai";
import { createWalletClient, http, parseEther, parseUnits, encodeFunctionData, type Hex, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chain, AUSD_ADDRESS, AUSD_DECIMALS, ERC20_ABI } from "@/lib/chain";


export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    const parsed = z.object({
      companyId: z.string().uuid(),
      employeeId: z.string().uuid(),
      claimDescription: z.string().trim().min(1).max(4000),
      amountEth: z.string().regex(/^\d+(\.\d{1,18})?$/),
      receiptBase64: z.string().min(1).max(12_000_000),
    }).safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Provide a company, employee, receipt, business purpose and valid claim amount." }, { status: 400 });
    }
    const { companyId, employeeId, claimDescription, amountEth, receiptBase64 } = parsed.data;
    if (employeeId !== sessionUser.id) {
      return NextResponse.json({ error: "You can only submit claims for your own employee account" }, { status: 403 });
    }
    await requireEmployeeCompany(sessionUser.id, companyId);

    // Resolve payout authority on the server, independently of the agent catalog UI.
    const { program, agent, delegation, caveats } = await loadReimbursementProgram(companyId);
    if (program.status !== "ready" || !agent || !delegation?.signedDelegation) {
      return NextResponse.json({
        code: "REIMBURSEMENT_NOT_READY",
        error: reimbursementEmployeeMessage(program.status),
      }, { status: 409 });
    }
    const agentId = agent.id;
    const [employee] = await db.select().from(employeeProfiles).where(and(
      eq(employeeProfiles.userId, sessionUser.id), eq(employeeProfiles.companyId, companyId),
    )).limit(1);
    if (!employee?.smartAccountAddress) {
      return NextResponse.json({ error: "Activate your employee account to receive reimbursement payments." }, { status: 409 });
    }
    const claimWei = parseEther(amountEth);
    if (claimWei <= 0n) {
      return NextResponse.json({ error: "Claim amount must be greater than zero." }, { status: 400 });
    }
    if (program.remainingAmount !== null && claimWei > parseEther(program.remainingAmount)) {
      return NextResponse.json({ error: "The claim exceeds the remaining reimbursement budget of " + program.remainingAmount + " " + TOKEN_SYMBOL + "." }, { status: 400 });
    }
    const mappedCaveats = caveats.map(c => ({ ...c, createdAt: c.createdAt.toISOString() }));

    // 3. Verify Receipt with Qwen Vision (Stateless, no storage)
    let receiptUrl = null;
    let visionReasoning = "";
    
    if (receiptBase64) {
      try {
        const base64Data = receiptBase64.split(',')[1] || receiptBase64;
        
        // Verify with Qwen Vision
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
    let companyPolicy: string | null = null;
    if (companyId) {
      const [co] = await db.select({ companyPolicy: companies.companyPolicy })
        .from(companies).where(eq(companies.id, companyId)).limit(1);
      companyPolicy = co?.companyPolicy ?? null;
    }

    // Qwen Policy Check
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

    // The employer may have stopped payouts while the AI was evaluating the claim.
    const current = await loadReimbursementProgram(companyId);
    if (current.program.status !== "ready" || current.delegation?.id !== delegation.id) {
      return NextResponse.json({ code: "REIMBURSEMENT_NOT_READY", error: "Reimbursement settings changed while this claim was being reviewed. Refresh the status before trying again." }, { status: 409 });
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
      const publicClient = createPublicClient({ chain, transport: http() });
      const walletClient = createWalletClient({ account, chain, transport: http() });
      
      const { bundlerUrl, paymasterUrl, sponsorId } = getPimlicoConfig();

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
      const { createBundlerClient, createPaymasterClient } = await import("viem/account-abstraction");
      const paymasterClient = createPaymasterClient({
        transport: http(paymasterUrl),
      });
      const bundlerClient = createBundlerClient({
        client: publicClient,
        chain,
        paymaster: paymasterClient,
        paymasterContext: sponsorId ? { policyId: sponsorId } : undefined,
        transport: http(bundlerUrl),
        userOperation: {
          estimateFeesPerGas: async () => {
            return await getPimlicoGasPrice(bundlerUrl);
          },
        },
      });

      // 5c. Send UserOp
      const env = getSmartAccountsEnvironment(chain.id);
      const isErc20Delegation = Boolean(
        (delegation.signedDelegation as any)?.caveats?.some(
          (c: any) => c.enforcer?.toLowerCase() === env.caveatEnforcers.ERC20TransferAmountEnforcer?.toLowerCase()
        )
      );

      const claimCall = isErc20Delegation
        ? {
            to: AUSD_ADDRESS,
            value: 0n,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: "transfer",
              args: [employee.smartAccountAddress as Hex, parseUnits(parsed.data.amountEth.replace(/[^0-9.]/g, ''), AUSD_DECIMALS)],
            }),
            permissionContext: [delegation.signedDelegation],
            delegationManager: env.DelegationManager as Hex,
          }
        : {
            to: employee.smartAccountAddress as Hex,
            value: claimWei,
            data: "0x" as Hex,
            permissionContext: [delegation.signedDelegation],
            delegationManager: env.DelegationManager as Hex,
          };

      const userOpHash = await bundlerClient.sendUserOperation({
        account: sa as any,
        calls: [claimCall] as any
      });

      const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
      if (!receipt.success || receipt.receipt.status !== "success") {
        throw new Error("Reimbursement payment was not confirmed successfully.");
      }
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
    if (error instanceof Error && (error.message.startsWith("Unauthorized:") || error.message.startsWith("Forbidden:"))) {
      return NextResponse.json({ error: error.message }, { status: error.message.startsWith("Unauthorized:") ? 401 : 403 });
    }
    console.error("Reimbursement claim error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
