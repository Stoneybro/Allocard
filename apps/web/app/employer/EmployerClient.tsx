"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCompanyInvite,
  getCompanyDashboardState,
  getWalletProfile,
  type CompanyDashboardState,
  type WalletProfile,
} from "@/app/actions/identity";
import {
  ConnectRequiredCard,
  useConnectedWalletAddress,
} from "@/components/auth-state";
import { DashboardFlowCanvas } from "@/components/dashboard-flow-canvas";
import { DashboardShell } from "@/components/dashboard-shell";
import { SectionCards } from "@/components/section-cards";
import { formatWalletAddress } from "@/lib/wallet";

const placeholderAgents = [
  {
    id: "placeholder-policy-agent",
    name: "Policy reviewer",
    smartAccountAddress: null,
    createdAt: new Date(0).toISOString(),
    isPlaceholder: true,
  },
  {
    id: "placeholder-travel-agent",
    name: "Travel booking agent",
    smartAccountAddress: null,
    createdAt: new Date(0).toISOString(),
    isPlaceholder: true,
  },
];

type DashboardAgent = Omit<
  CompanyDashboardState["agents"][number],
  "smartAccountAddress"
> & {
  smartAccountAddress: string | null;
  isPlaceholder?: boolean;
};

export function EmployerClient() {
  const router = useRouter();
  const { address, isConnected } = useConnectedWalletAddress();
  const [profile, setProfile] = useState<WalletProfile | null>(null);
  const [dashboardState, setDashboardState] =
    useState<CompanyDashboardState | null>(null);
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
      setDashboardState(await getCompanyDashboardState(address));
    });
  }, [address, isConnected, router]);

  const company = dashboardState?.company ?? profile?.company ?? null;
  const companyName = company?.name ?? "Allocard";
  const agents: DashboardAgent[] = useMemo(() => {
    if (!dashboardState) return placeholderAgents;

    return dashboardState.agents.length > 0
      ? dashboardState.agents
      : placeholderAgents;
  }, [dashboardState]);
  const smartAccountLabel = company?.smartAccountAddress
    ? formatWalletAddress(company.smartAccountAddress)
    : "Smart account pending";

  if (!isConnected || !address) {
    return <ConnectRequiredCard />;
  }

  if (!profile || profile.status !== "employer" || !company || !dashboardState) {
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
      copiedInvite={copied}
      employees={dashboardState.employees.map((employee, index) => ({
        id: employee.id,
        label: `Employee ${index + 1}`,
        detail: employee.smartAccountAddress
          ? formatWalletAddress(employee.smartAccountAddress)
          : "Smart account pending",
      }))}
      agents={agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        detail: agent.smartAccountAddress
          ? formatWalletAddress(agent.smartAccountAddress)
          : "Smart account pending",
        isPlaceholder: agent.isPlaceholder,
      }))}
      inviteError={error}
      inviteLink={inviteLink}
      invitePending={isPending}
      onCopyInvite={handleCopyInvite}
      onCreateInvite={handleCreateInvite}
      roleLabel="Company owner"
      smartAccountLabel={smartAccountLabel}
      title="Company dashboard"
    >
      <div className="flex min-h-full flex-col gap-4">
        <SectionCards
          employeeCount={dashboardState.summary.employeeCount}
          activeAgentCount={dashboardState.summary.activeAgentCount}
          activeDelegationCount={dashboardState.summary.activeDelegationCount}
          delegatedNativeEthAllowance={
            dashboardState.summary.delegatedNativeEthAllowance
          }
        />
        <DashboardFlowCanvas
          company={company}
          employees={dashboardState.employees.map((employee, index) => ({
            id: employee.id,
            label: `Employee ${index + 1}`,
            smartAccountAddress: employee.smartAccountAddress,
          }))}
          agents={agents.map((agent) => ({
            id: agent.id,
            name: agent.name,
            smartAccountAddress: agent.smartAccountAddress,
            isPlaceholder: agent.isPlaceholder,
          }))}
          delegations={dashboardState.delegations}
        />
      </div>
    </DashboardShell>
  );
}
