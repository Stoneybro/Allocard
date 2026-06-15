import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-guard";
import { delegations, agentBookings, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createPublicClient, createWalletClient, http, parseEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { getPimlicoGasPrice } from "@/lib/client";

export async function POST(req: Request) {
  try {
    await requireSession();
    const { travelPlan, delegationId, agentId, employeeId, companyId } = await req.json();

    if (!delegationId || !travelPlan || !agentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [delegation] = await db
      .select()
      .from(delegations)
      .where(eq(delegations.id, delegationId))
      .limit(1);

    if (!delegation || !delegation.signedDelegation) {
      return NextResponse.json({ error: "Active delegation not found" }, { status: 404 });
    }

    // Fetch the parent delegation (company → employee) to build the full chain
    let parentDelegation: typeof delegation | null = null;
    if (delegation.parentDelegationId) {
      const [parentRow] = await db
        .select()
        .from(delegations)
        .where(eq(delegations.id, delegation.parentDelegationId))
        .limit(1);
      parentDelegation = parentRow ?? null;
    }

    if (!parentDelegation || !parentDelegation.signedDelegation) {
      return NextResponse.json({ error: "Parent delegation (company → employee) not found" }, { status: 404 });
    }

    const [employee] = await db
      .select()
      .from(users)
      .where(eq(users.id, employeeId))
      .limit(1);

    if (!employee || !employee.smartAccountAddress) {
      return NextResponse.json({ error: "Employee smart account not found" }, { status: 404 });
    }

    // Agent Credentials
    const pkey = process.env.AGENTS_PRIVATE_KEY;
    if (!pkey) {
      throw new Error("Server missing agent credentials");
    }

    let txHash: string | null = null;
    let finalStatus: "approved" | "failed" = "approved";

    try {
      const account = privateKeyToAccount(pkey.startsWith('0x') ? pkey as Hex : `0x${pkey}`);
      const publicClient = createPublicClient({ chain: sepolia, transport: http() });
      const walletClient = createWalletClient({ account, chain: sepolia, transport: http() });
      
      const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL;
      const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL;
      const sponsorId = process.env.NEXT_PUBLIC_PIMLICO_SPONSOR_ID;
      if (!bundlerUrl) throw new Error("Missing NEXT_PUBLIC_BUNDLER_RPC_URL");
      if (!paymasterUrl) throw new Error("Missing NEXT_PUBLIC_PAYMASTER_RPC_URL");

      // Re-create Travel Agent Smart Account (deterministic salt 2)
      const { toMetaMaskSmartAccount, Implementation, getSmartAccountsEnvironment } = await import("@metamask/smart-accounts-kit");
      const sa = await toMetaMaskSmartAccount({
        client: publicClient as any,
        implementation: Implementation.Hybrid,
        deployParams: [account.address, [], [], []],
        deploySalt: "0x0000000000000000000000000000000000000000000000000000000000000002",
        signer: { walletClient: walletClient as any }
      });

      const { createBundlerClient, createPaymasterClient } = await import("viem/account-abstraction");
      const paymasterClient = createPaymasterClient({
        transport: http(paymasterUrl),
      });
      const bundlerClient = createBundlerClient({
        client: publicClient,
        chain: sepolia,
        paymaster: paymasterClient,
        paymasterContext: sponsorId ? { policyId: sponsorId } : undefined,
        transport: http(bundlerUrl),
        userOperation: {
          estimateFeesPerGas: async () => {
            return await getPimlicoGasPrice(bundlerUrl);
          },
        },
      });

      const env = getSmartAccountsEnvironment(sepolia.id);
      
      // Calculate split values
      const targets = travelPlan.merchantTargets || [];
      if (targets.length === 0) {
        throw new Error("No merchant targets defined by AI");
      }
      
      const totalWei = parseEther(travelPlan.estimatedCostEth.replace(/[^0-9.]/g, ''));
      const splitWei = totalWei / BigInt(targets.length);

      // Chain: [employee→agent (inner), company→employee (outer)]
      const permissionContext = [delegation.signedDelegation, parentDelegation.signedDelegation];

      const calls = targets.map((target: string) => ({
        to: employee.smartAccountAddress as Hex,
        value: splitWei,
        data: "0x" as Hex,
        permissionContext,
        delegationManager: env.DelegationManager as Hex,
      }));

      const userOpHash = await bundlerClient.sendUserOperation({
        account: sa as any,
        calls: calls as any
      });

      const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
      txHash = receipt.receipt.transactionHash;

    } catch (err: any) {
      console.error("Booking on-chain execution failed:", err);
      finalStatus = "failed";
      return NextResponse.json({ error: "On-chain execution failed: " + err.message }, { status: 500 });
    }

    // Save booking to DB
    await db.insert(agentBookings).values({
      delegationId,
      agentId,
      employeeId,
      companyId,
      bookingDetails: travelPlan,
      amountEth: travelPlan.estimatedCostEth,
      txHash: txHash || "pending",
      venicePrompt: travelPlan.prompt,
      veniceReasoning: travelPlan.reasoning,
      veniceConfidence: travelPlan.confidence,
    });

    return NextResponse.json({ success: true, txHash });
  } catch (err: any) {
    console.error("Travel booking error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
