"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheckIcon, WalletCardsIcon } from "lucide-react";
import { getWalletProfile, type WalletProfile } from "@/app/actions/identity";
import { ConnectRequiredCard, useConnectedWalletAddress } from "@/components/auth-state";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SmartAccountActivationButton } from "@/components/smart-account-activation-button";
import { formatWalletAddress } from "@/lib/wallet";

export function EmployeeClient() {
  const router = useRouter();
  const { address, isConnected } = useConnectedWalletAddress();
  const [profile, setProfile] = useState<WalletProfile | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!address || !isConnected) return;

    startTransition(async () => {
      const nextProfile = await getWalletProfile(address);

      if (nextProfile.status === "new") {
        router.replace("/onboarding");
        return;
      }

      if (nextProfile.status === "employer") {
        router.replace("/employer");
        return;
      }

      setProfile(nextProfile);
    });
  }, [address, isConnected, router]);

  if (!isConnected || !address) {
    return <ConnectRequiredCard />;
  }

  if (!profile || profile.status !== "employee" || !profile.company) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {isPending ? "Loading employee workspace..." : "Checking access..."}
        </p>
      </div>
    );
  }

  const smartAccountLabel = profile.user.smartAccountAddress
    ? formatWalletAddress(profile.user.smartAccountAddress)
    : "Smart account pending";

  const handleSmartAccountActivated = (smartAccountAddress: string | null) => {
    if (!smartAccountAddress) return;

    setProfile((currentProfile) => {
      if (!currentProfile || currentProfile.status !== "employee") {
        return currentProfile;
      }

      return {
        ...currentProfile,
        user: {
          ...currentProfile.user,
          smartAccountAddress,
        },
      };
    });
  };

  return (
    <DashboardShell
      companyName={profile.company.name}
      smartAccountLabel={smartAccountLabel}
      title="Employee dashboard"
      roleLabel="Employee"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <ShieldCheckIcon />
                <CardTitle className="mt-2">Employee access is active</CardTitle>
                <CardDescription>
                  This wallet is linked to {profile.company.name}. Future visits
                  load this company automatically, without the invite link.
                </CardDescription>
              </div>
              <SmartAccountActivationButton
                walletAddress={address}
                existingSmartAccountAddress={profile.user.smartAccountAddress}
                onActivated={(result) =>
                  handleSmartAccountActivated(result.smartAccountAddress)
                }
              />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Smart account</p>
              <p className="mt-1 break-all font-mono text-sm">
                {smartAccountLabel}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="mt-1 text-sm font-medium">{profile.company.name}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <WalletCardsIcon />
            <CardTitle>Spending authority</CardTitle>
            <CardDescription>
              Delegations from your company will appear here in the next phase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">No active delegations yet</Badge>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
