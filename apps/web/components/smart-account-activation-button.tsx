"use client";

import { useState, useTransition } from "react";
import { createBundlerClient, createPaymasterClient } from "viem/account-abstraction";
import { http } from "viem";
import { baseSepolia } from "viem/chains";
import { LoaderCircleIcon, RocketIcon } from "lucide-react";
import { activateSmartAccount } from "@/app/actions/identity";
import { Button } from "@/components/ui/button";
import { publicClient } from "@/lib/client";
import { createInjectedWalletClient } from "@/lib/signer";
import { createHybridSmartAccount } from "@/lib/smartAccount";

type ActivationResult = Awaited<ReturnType<typeof activateSmartAccount>>;

export function SmartAccountActivationButton({
  walletAddress,
  existingSmartAccountAddress,
  onActivated,
}: {
  walletAddress: `0x${string}`;
  existingSmartAccountAddress: string | null;
  onActivated?: (result: ActivationResult) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleActivate = () => {
    setError(null);

    startTransition(async () => {
      try {
        const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL;
        const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL;
        const sponsorId = process.env.NEXT_PUBLIC_PIMLICO_SPONSOR_ID;

        if (!bundlerUrl) {
          throw new Error("Missing NEXT_PUBLIC_BUNDLER_RPC_URL");
        }

        if (!paymasterUrl) {
          throw new Error("Missing NEXT_PUBLIC_PAYMASTER_RPC_URL");
        }

        const walletClient = createInjectedWalletClient(walletAddress);
        const smartAccount = await createHybridSmartAccount(walletClient);

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

        if (!(await smartAccount.isDeployed())) {
          throw new Error("The smart account deployment was not confirmed");
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
        disabled={isPending}
      >
        {isPending ? (
          <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
        ) : (
          <RocketIcon data-icon="inline-start" />
        )}
        {isPending ? "Activating..." : "Activate smart account"}
      </Button>
      {error ? (
        <p className="max-w-72 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
