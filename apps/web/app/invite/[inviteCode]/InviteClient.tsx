"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite, type InviteDetails } from "@/app/actions/identity";
import { ConnectRequiredCard, useConnectedWalletAddress } from "@/components/auth-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function InviteClient({ details }: { details: InviteDetails }) {
  const router = useRouter();
  const { address, isConnected } = useConnectedWalletAddress();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (details.status === "not_found") {
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invite not found</CardTitle>
            <CardDescription>
              This invite link is invalid or has been removed.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <ConnectRequiredCard
        title={`Join ${details.invite.companyName}`}
        description="Connect the wallet you want to use as your employee identity."
      />
    );
  }

  const handleAcceptInvite = () => {
    setError(null);

    startTransition(async () => {
      try {
        const profile = await acceptInvite({
          walletAddress: address,
          inviteCode: details.invite.inviteCode,
        });

        router.replace(profile.status === "employee" ? "/employee" : "/employer");
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Invite acceptance failed";
        setError(message);
      }
    });
  };

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <Badge variant="secondary" className="w-fit">
            Employee invite
          </Badge>
          <CardTitle>Join {details.invite.companyName}</CardTitle>
          <CardDescription>
            This will link your connected wallet to the company as an employee.
            You only need this invite once.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {details.status === "expired" ? (
            <p className="text-sm font-medium text-destructive">
              This invite has expired. Ask your company admin for a new link.
            </p>
          ) : null}
          {details.status === "accepted" ? (
            <p className="text-sm text-muted-foreground">
              This invite has already been accepted. If it was accepted with
              this wallet, continuing will take you to your employee dashboard.
            </p>
          ) : null}
          {error ? (
            <p className="text-sm font-medium text-destructive">{error}</p>
          ) : null}
          <Button
            onClick={handleAcceptInvite}
            disabled={isPending || details.status === "expired"}
          >
            {isPending ? "Joining company..." : "Join company"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
