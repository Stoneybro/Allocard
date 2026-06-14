"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { acceptInvite, type InviteDetails } from "@/app/actions/identity";
import { createSession } from "@/lib/session";
import { ConnectRequiredCard } from "@/components/auth-state";
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
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Not found ─────────────────────────────────────────────────────────────
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

  // ── Auth guards ───────────────────────────────────────────────────────────
  if (auth.status === "unauthenticated") {
    return (
      <ConnectRequiredCard
        title={`Join ${details.invite.companyName}`}
        description="Connect the wallet you want to use as your employee identity."
      />
    );
  }

  if (auth.status === "initializing") {
    return (
      <div className="flex h-full min-h-screen items-center justify-center p-6 bg-white">
        <div className="flex flex-col items-center gap-6 text-center">
          <img src="/AllocardLogoBlack.svg" alt="Allocard Logo" className="w-16 h-16 object-contain mb-4" />
          <div className="w-10 h-10 border-4 border-[#eaeaea] border-t-[#111] rounded-full animate-spin"></div>
          <p className="text-xl font-bold text-[#111] tracking-[-0.02em]">Initializing wallet...</p>
        </div>
      </div>
    );
  }

  if (auth.status === "error") {
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Connection Error</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-destructive">{auth.message}</p>
            <Button onClick={auth.retry}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Accept invite handler ─────────────────────────────────────────────────
  const handleAcceptInvite = () => {
    setError(null);

    startTransition(async () => {
      try {
        await createSession(auth.address);
        const profile = await acceptInvite({
          walletAddress: auth.address,
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
