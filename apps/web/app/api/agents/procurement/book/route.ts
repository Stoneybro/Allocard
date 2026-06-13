import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-guard";
import { delegations, agentBookings, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createPublicClient, createWalletClient, http, parseEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

export async function POST(req: Request) {
  try {
    await requireSession();
    const { vendorChoice, delegationId, agentId, employeeId, companyId } = await req.json();

    if (!delegationId || !vendorChoice || !agentId) {
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

    try {
      const account = privateKeyToAccount(pkey.startsWith('0x') ? pkey as Hex : `0x${pkey}`);
      const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
      const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() });
      
      const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL;
      const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL;
      const sponsorId = process.env.NEXT_PUBLIC_PIMLICO_SPONSOR_ID;
      if (!bundlerUrl) throw new Error("Missing NEXT_PUBLIC_BUNDLER_RPC_URL");
      if (!paymasterUrl) throw new Error("Missing NEXT_PUBLIC_PAYMASTER_RPC_URL");

      // Re-create Procurement Agent Smart Account (deterministic salt 3)
      const { toMetaMaskSmartAccount, Implementation, getSmartAccountsEnvironment } = await import("@metamask/smart-accounts-kit");
      const sa = await toMetaMaskSmartAccount({
        client: publicClient as any,
        implementation: Implementation.Hybrid,
        deployParams: [account.address, [], [], []],
        deploySalt: "0x0000000000000000000000000000000000000000000000000000000000000003",
        signer: { walletClient: walletClient as any }
      });

      const { createBundlerClient, createPaymasterClient } = await import("viem/account-abstraction");
      const paymasterClient = createPaymasterClient({
        transport: http(paymasterUrl),
      });
      const bundlerClient = createBundlerClient({
        client: publicClient,
        chain: baseSepolia,
        paymaster: paymasterClient,
        paymasterContext: sponsorId ? { policyId: sponsorId } : undefined,
        transport: http(bundlerUrl),
      });

      const env = getSmartAccountsEnvironment(baseSepolia.id);
      
      const totalWei = parseEther(vendorChoice.estimatedCostEth.replace(/[^0-9.]/g, ''));

      // Chain: [employee→agent (inner), company→employee (outer)]
      // DelegationManager traces the chain and deducts from the company treasury
      const permissionContext = [delegation.signedDelegation, parentDelegation.signedDelegation];

      const userOpHash = await bundlerClient.sendUserOperation({
        account: sa as any,
        calls: [{
          to: employee.smartAccountAddress as Hex,
          value: totalWei,
          data: "0x" as Hex,
          permissionContext,
          delegationManager: env.DelegationManager as Hex,
        }] as any
      });

      const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
      txHash = receipt.receipt.transactionHash;

    } catch (err: any) {
      console.error("Procurement on-chain execution failed:", err);
      return NextResponse.json({ error: "On-chain execution failed: " + err.message }, { status: 500 });
    }

    // Save booking to DB
    await db.insert(agentBookings).values({
      delegationId,
      agentId,
      employeeId,
      companyId,
      bookingDetails: vendorChoice,
      amountEth: vendorChoice.estimatedCostEth,
      txHash: txHash || "pending",
      venicePrompt: vendorChoice.prompt || "procurement_prompt_missing",
      veniceReasoning: vendorChoice.reasoning,
      veniceConfidence: vendorChoice.confidence,
    });

    return NextResponse.json({ success: true, txHash });
  } catch (err: any) {
    console.error("Procurement booking error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
