"use client";

import { useMemo, useState, useTransition } from "react";
import { createBundlerClient, createPaymasterClient } from "viem/account-abstraction";
import { http } from "viem";
import { baseSepolia } from "viem/chains";
import { LoaderCircleIcon, RocketIcon } from "lucide-react";
import { useWalletClient, useSwitchChain, useChainId } from "wagmi";
import { activateSmartAccount } from "@/app/actions/identity";
import { Button } from "@/components/ui/button";
import { publicClient } from "@/lib/client";
import { createHybridSmartAccount } from "@/lib/smartAccount";

type ActivationResult = Awaited<ReturnType<typeof activateSmartAccount>>;

const SMART_ACCOUNT_CONFIRMATION_ATTEMPTS = 8;
const SMART_ACCOUNT_CONFIRMATION_DELAY_MS = 1_250;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDeploymentConfirmation(
  smartAccount: Awaited<ReturnType<typeof createHybridSmartAccount>>,
) {
  for (let attempt = 0; attempt < SMART_ACCOUNT_CONFIRMATION_ATTEMPTS; attempt += 1) {
    if (await smartAccount.isDeployed()) {
      return true;
    }

    if (attempt < SMART_ACCOUNT_CONFIRMATION_ATTEMPTS - 1) {
      await sleep(SMART_ACCOUNT_CONFIRMATION_DELAY_MS);
    }
  }

  return false;
}

export function SmartAccountActivationButton({
  walletAddress,
  existingSmartAccountAddress,
  onActivated,
}: {
  walletAddress: `0x${string}`;
  existingSmartAccountAddress: string | null;
  onActivated?: (result: ActivationResult) => void;
}) {
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const chainId = useChainId();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isWalletReady = useMemo(() => Boolean(walletClient), [walletClient]);

  const handleActivate = () => {
    if (!walletClient) {
      setError("Wallet not connected");
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        if (chainId !== baseSepolia.id) {
          try {
            await switchChainAsync({ chainId: baseSepolia.id });
          } catch (switchError) {
            console.warn("Could not switch chain via wagmi", switchError);
            // Ignore switch error, we might be able to recreate the wallet client
          }
        }

        const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL;
        const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL;
        const sponsorId = process.env.NEXT_PUBLIC_PIMLICO_SPONSOR_ID;

        if (!bundlerUrl) {
          throw new Error("Missing NEXT_PUBLIC_BUNDLER_RPC_URL");
        }

        if (!paymasterUrl) {
          throw new Error("Missing NEXT_PUBLIC_PAYMASTER_RPC_URL");
        }

        const smartAccount = await createHybridSmartAccount(
          walletClient as Parameters<typeof createHybridSmartAccount>[0],
          walletAddress,
        );

        if (!(await smartAccount.isDeployed())) {
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

          const userOperationHash = await bundlerClient.sendUserOperation({
            account: smartAccount,
            calls: [
              {
                to: walletAddress,
                value: 0n,
              },
            ],
          });

          await bundlerClient.waitForUserOperationReceipt({
            hash: userOperationHash,
          });
        }

        if (!(await waitForDeploymentConfirmation(smartAccount))) {
          throw new Error("The smart account deployment is taking longer than expected. Please wait a moment and try again.");
        }

        const result = await activateSmartAccount({
          walletAddress,
          smartAccountAddress: smartAccount.address,
        });

        onActivated?.(result);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Could not activate smart account";
        setError(message);
      }
    });
  };

  if (existingSmartAccountAddress) {
    return null;
  }

  return (
    <div className="flex max-w-full flex-col items-start gap-2">
      <Button
        type="button"
        size="sm"
        onClick={handleActivate}
        disabled={isPending || !isWalletReady}
      >
        {isPending ? (
          <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
        ) : (
          <RocketIcon data-icon="inline-start" />
        )}
        {isPending ? "Activating..." : isWalletReady ? "Activate smart account" : "Preparing wallet..."}
      </Button>
      {error ? (
        <p className="max-w-72 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
