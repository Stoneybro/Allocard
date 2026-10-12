import { NextRequest, NextResponse } from "next/server";
import { isAddress, createPublicClient, createWalletClient, http, parseEther, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  chain,
  AUSD_ADDRESS,
  AGORA_FAUCET_ADDRESS,
  AGORA_FAUCET_ABI,
  ERC20_ABI,
  AUSD_DECIMALS,
  FAUCET_DRIP_AMOUNT,
} from "@/lib/chain";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const recipient = body.recipient as `0x${string}` | undefined;

    if (!recipient || !isAddress(recipient)) {
      return NextResponse.json(
        { error: "Valid recipient address is required" },
        { status: 400 }
      );
    }

    const relayerKey = process.env.AGENTS_PRIVATE_KEY;
    if (!relayerKey) {
      return NextResponse.json(
        { error: "Relayer private key not configured" },
        { status: 500 }
      );
    }

    const formattedKey = relayerKey.startsWith("0x")
      ? (relayerKey as `0x${string}`)
      : (`0x${relayerKey}` as `0x${string}`);

    const account = privateKeyToAccount(formattedKey);
    const transport = http(process.env.NEXT_PUBLIC_BUNDLER_RPC_URL ? undefined : "https://testnet-rpc.monad.xyz");

    const publicClient = createPublicClient({
      chain,
      transport: http("https://testnet-rpc.monad.xyz"),
    });

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http("https://testnet-rpc.monad.xyz"),
    });

    // 1. Call Agora Faucet to request 10,000 AUSD for the recipient
    const txHash = await walletClient.writeContract({
      address: AGORA_FAUCET_ADDRESS,
      abi: AGORA_FAUCET_ABI,
      functionName: "requestFunds",
      args: [recipient],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    // 2. Also ensure recipient has a small native MON buffer (0.05 MON) if empty
    let gasTxHash: `0x${string}` | null = null;
    try {
      const nativeBalance = await publicClient.getBalance({ address: recipient });
      if (nativeBalance < parseEther("0.02")) {
        gasTxHash = await walletClient.sendTransaction({
          to: recipient,
          value: parseEther("0.05"),
        });
        await publicClient.waitForTransactionReceipt({ hash: gasTxHash });
      }
    } catch (gasErr) {
      console.warn("Gas buffer top-up optional notice:", gasErr);
    }

    // 3. Read confirmed AUSD balance
    const updatedBalanceRaw = await publicClient.readContract({
      address: AUSD_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [recipient],
    });

    const updatedBalance = formatUnits(updatedBalanceRaw, AUSD_DECIMALS);

    return NextResponse.json({
      success: true,
      txHash,
      gasTxHash,
      dripAmount: FAUCET_DRIP_AMOUNT,
      symbol: "AUSD",
      currentBalance: updatedBalance,
      recipient,
    });
  } catch (error: any) {
    console.error("Agora faucet seed error:", error);
    const message = error?.message || "Failed to request funds from Agora faucet";
    // Check if cooldown error
    if (message.includes("cooldown") || message.includes("reverted")) {
      return NextResponse.json(
        { error: "Faucet cooldown is active (60s). Please try again shortly." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
