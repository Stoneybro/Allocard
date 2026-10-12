import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEmployeeCompany, requireSessionUser } from "@/lib/auth-guard";
import { agentBookings } from "@/lib/db/schema";
import { loadAgoraProgram } from "@/lib/agora/server";
import { agoraEmployeeMessage } from "@/lib/agora/shared";
import { getPimlicoGasPrice } from "@/lib/client";
import { TOKEN_SYMBOL, AUSD_ADDRESS, AUSD_DECIMALS, ERC20_ABI, chain } from "@/lib/chain";
import { z } from "zod";
import { createWalletClient, http, parseUnits, encodeFunctionData, type Hex, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();

    const schema = z.object({
      companyId: z.string().uuid(),
      employeeId: z.string().uuid(),
      contractorName: z.string().trim().min(1).max(256),
      recipientAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      originalCurrency: z.string().min(2).max(10),
      originalAmount: z.string().regex(/^\d+(\.\d{1,18})?$/),
      amountAusd: z.string().regex(/^\d+(\.\d{1,6})?$/),
      description: z.string().trim().min(1).max(4000),
      receiptBase64: z.string().optional().nullable(),
    });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid remittance input: " + parsed.error.issues[0]?.message }, { status: 400 });
    }

    const {
      companyId,
      employeeId,
      contractorName,
      recipientAddress,
      originalCurrency,
      originalAmount,
      amountAusd,
      description,
    } = parsed.data;

    if (employeeId !== sessionUser.id) {
      return NextResponse.json({ error: "You can only initiate remittances for your own employee account" }, { status: 403 });
    }
    await requireEmployeeCompany(sessionUser.id, companyId);

    // 1. Load the Agora Cross-Border Program for this company
    const { program, agent, delegation } = await loadAgoraProgram(companyId);
    if (program.status !== "ready" || !agent || !delegation?.signedDelegation) {
      return NextResponse.json(
        { error: agoraEmployeeMessage(program.status) },
        { status: 409 },
      );
    }

    const ausdUnits = parseUnits(amountAusd, AUSD_DECIMALS);
    if (ausdUnits <= 0n) {
      return NextResponse.json({ error: "Remittance amount must be greater than zero." }, { status: 400 });
    }

    if (program.remainingAmount !== null && ausdUnits > parseUnits(program.remainingAmount, AUSD_DECIMALS)) {
      return NextResponse.json(
        {
          error: `Remittance amount exceeds remaining pool balance of ${program.remainingAmount} ${TOKEN_SYMBOL}.`,
        },
        { status: 400 },
      );
    }

    // 2. On-Chain Execution via Agent Smart Account
    const pkey = process.env.AGENTS_PRIVATE_KEY;
    if (!pkey) throw new Error("Server missing agent credentials");

    const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL;
    const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL;
    const sponsorId = process.env.NEXT_PUBLIC_PIMLICO_SPONSOR_ID;
    if (!bundlerUrl) throw new Error("Missing NEXT_PUBLIC_BUNDLER_RPC_URL");
    if (!paymasterUrl) throw new Error("Missing NEXT_PUBLIC_PAYMASTER_RPC_URL");

    const account = privateKeyToAccount(pkey.startsWith("0x") ? (pkey as Hex) : `0x${pkey}`);
    const publicClient = createPublicClient({ chain, transport: http() });
    const walletClient = createWalletClient({ account, chain, transport: http() });

    const { toMetaMaskSmartAccount, Implementation, getSmartAccountsEnvironment } = await import(
      "@metamask/smart-accounts-kit"
    );

    // Agora Remittance Agent uses deterministic salt 2
    const agentSmartAccount = await toMetaMaskSmartAccount({
      client: publicClient as any,
      implementation: Implementation.Hybrid,
      deployParams: [account.address, [], [], []],
      deploySalt: "0x0000000000000000000000000000000000000000000000000000000000000002",
      signer: { walletClient: walletClient as any },
    });

    const { createBundlerClient, createPaymasterClient } = await import("viem/account-abstraction");
    const paymasterClient = createPaymasterClient({ transport: http(paymasterUrl) });
    const bundlerClient = createBundlerClient({
      client: publicClient,
      chain,
      paymaster: paymasterClient,
      paymasterContext: sponsorId ? { policyId: sponsorId } : undefined,
      transport: http(bundlerUrl),
      userOperation: {
        estimateFeesPerGas: async () => await getPimlicoGasPrice(bundlerUrl),
      },
    });

    const env = getSmartAccountsEnvironment(chain.id);
    const permissionContext = [delegation.signedDelegation];

    const remitCall = {
      to: AUSD_ADDRESS,
      value: 0n,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [recipientAddress as Hex, ausdUnits],
      }),
      permissionContext,
      delegationManager: env.DelegationManager as Hex,
    };

    const userOpHash = await bundlerClient.sendUserOperation({
      account: agentSmartAccount as any,
      calls: [remitCall] as any,
    });

    const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
    const txHash = receipt.receipt.transactionHash;

    // 3. Save Remittance Record to Database
    const bookingDetails = {
      type: "agora_cross_border_remittance",
      contractorName,
      recipientAddress,
      originalCurrency,
      originalAmount,
      amountAusd,
      description,
      settledAt: new Date().toISOString(),
      network: "Monad Testnet",
      token: "Agora AUSD",
    };

    await db.insert(agentBookings).values({
      delegationId: delegation.id,
      agentId: agent.id,
      employeeId,
      companyId,
      bookingDetails,
      amountEth: amountAusd,
      txHash: txHash || "pending",
      venicePrompt: `Remittance to ${contractorName}: ${originalAmount} ${originalCurrency} -> ${amountAusd} AUSD`,
      veniceReasoning: `Approved under Agora Cross-Border Remittance Policy. Instant settlement on Monad.`,
      veniceConfidence: 1.0,
    });

    return NextResponse.json({
      success: true,
      txHash,
      settledAusd: amountAusd,
      contractorName,
    });
  } catch (err: any) {
    console.error("Agora cross-border remittance error:", err);
    return NextResponse.json(
      { error: err.message || "An error occurred during cross-border remittance" },
      { status: 500 },
    );
  }
}
