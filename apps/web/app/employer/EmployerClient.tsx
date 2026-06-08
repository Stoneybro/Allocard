"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CopyIcon,
  LinkIcon,
  UserRoundIcon,
  WalletCardsIcon,
} from "lucide-react";
import {
  createCompanyInvite,
  getCompanyEmployees,
  getWalletProfile,
  type WalletProfile,
} from "@/app/actions/identity";
import { ConnectRequiredCard, useConnectedWalletAddress } from "@/components/auth-state";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatWalletAddress } from "@/lib/wallet";

type Employee = Awaited<ReturnType<typeof getCompanyEmployees>>[number];

export function EmployerClient() {
  const router = useRouter();
  const { address, isConnected } = useConnectedWalletAddress();
  const [profile, setProfile] = useState<WalletProfile | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!address || !isConnected) return;

    startTransition(async () => {
      const nextProfile = await getWalletProfile(address);

      if (nextProfile.status === "new") {
        router.replace("/onboarding");
        return;
      }

      if (nextProfile.status === "employee") {
        router.replace("/employee");
        return;
      }

      setProfile(nextProfile);
      setEmployees(await getCompanyEmployees(address));
    });
  }, [address, isConnected, router]);

  const companyName = profile?.company?.name ?? "Allocard";
  const displayWallet = useMemo(
    () => (address ? formatWalletAddress(address) : "Unknown wallet"),
    [address],
  );

  if (!isConnected || !address) {
    return <ConnectRequiredCard />;
  }

  if (!profile || profile.status !== "employer" || !profile.company) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {isPending ? "Loading company workspace..." : "Checking access..."}
        </p>
      </div>
    );
  }

  const handleCreateInvite = () => {
    setError(null);
    setCopied(false);

    startTransition(async () => {
      try {
        const invite = await createCompanyInvite(address);
        setInviteLink(`${window.location.origin}/invite/${invite.inviteCode}`);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Could not create invite";
        setError(message);
      }
    });
  };

  const handleCopyInvite = async () => {
    if (!inviteLink) return;

    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
  };

  return (
    <DashboardShell
      companyName={companyName}
      title="Company dashboard"
      walletAddress={displayWallet}
      roleLabel="Company owner"
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Company</CardDescription>
              <CardTitle>{companyName}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Employees</CardDescription>
              <CardTitle>{employees.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Master card</CardDescription>
              <CardTitle>
                {profile.company.smartAccountAddress ? "Active" : "Not active"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>
                Employees appear here after accepting an invite link with their
                wallet.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {employees.length === 0 ? (
                <div className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
                  No employees have joined this company yet.
                </div>
              ) : (
                employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <UserRoundIcon />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {formatWalletAddress(employee.walletAddress)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Joined {new Date(employee.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary">Employee</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <LinkIcon />
                <CardTitle>Invite employee</CardTitle>
                <CardDescription>
                  Create a single-use invite link and send it to an employee.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Button onClick={handleCreateInvite} disabled={isPending}>
                  {isPending ? "Creating invite..." : "Create invite link"}
                </Button>
                {inviteLink ? (
                  <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
                    <p className="break-all font-mono text-xs">{inviteLink}</p>
                    <Button variant="outline" onClick={handleCopyInvite}>
                      <CopyIcon />
                      {copied ? "Copied" : "Copy link"}
                    </Button>
                  </div>
                ) : null}
                {error ? (
                  <p className="text-sm font-medium text-destructive">{error}</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <WalletCardsIcon />
                <CardTitle>Smart account</CardTitle>
                <CardDescription>
                  Card activation will deploy and store the company smart
                  account address.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">
                  {profile.company.smartAccountAddress ?? "Not deployed"}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
