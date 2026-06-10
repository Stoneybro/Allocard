"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatEther } from "viem";
import {
  getEmployeeDashboardState,
  type EmployeeDashboardState,
} from "@/app/actions/identity";
import {
  ConnectRequiredCard,
  useConnectedWalletAddress,
} from "@/components/auth-state";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmployeeSectionCards } from "@/components/employee-section-cards";
import { EmployeeFlowCanvas } from "@/components/employee-flow-canvas";
import { SmartAccountActivationButton } from "@/components/smart-account-activation-button";
import { formatWalletAddress } from "@/lib/wallet";

export function EmployeeClient() {
  const router = useRouter();
  const { address, isConnected } = useConnectedWalletAddress();
  const [dashboardState, setDashboardState] =
    useState<EmployeeDashboardState | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!address || !isConnected) return;

    startTransition(async () => {
      // First check the wallet profile to guard routing
      const { getWalletProfile } = await import("@/app/actions/identity");
      const profile = await getWalletProfile(address);

      if (profile.status === "new") {
        router.replace("/onboarding");
        return;
      }

      if (profile.status === "employer") {
        router.replace("/employer");
        return;
      }

      // Load full employee dashboard state
      const state = await getEmployeeDashboardState(address);
      setDashboardState(state);
    });
  }, [address, isConnected, router]);

  if (!isConnected || !address) {
    return <ConnectRequiredCard />;
  }

  if (!dashboardState) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {isPending ? "Loading employee workspace..." : "Checking access..."}
        </p>
      </div>
    );
  }

  const { employee, company, summary } = dashboardState;

  const smartAccountLabel = employee.smartAccountAddress
    ? formatWalletAddress(employee.smartAccountAddress)
    : "Smart account pending";

  // Compute remaining authority: approved - redelegated (floor at 0)
  const approvedWei = (() => {
    try {
      const inbound = dashboardState.inboundDelegation;
      if (!inbound) return 0n;
      const caveat = inbound.caveats.find(
        (c) => c.caveatType === "nativeTokenTransferAmount",
      );
      if (!caveat) return 0n;
      const val = caveat.caveatValue as Record<string, unknown>;
      const weiStr = String(val.maxAmount ?? val.amount ?? "0");
      return BigInt(weiStr);
    } catch {
      return 0n;
    }
  })();

  const redelegatedWei = (() => {
    try {
      const activeOutbound = dashboardState.outboundDelegations.filter(
        (d) => d.status === "active",
      );
      return activeOutbound.reduce((sum, d) => {
        const caveat = d.caveats.find(
          (c) => c.caveatType === "nativeTokenTransferAmount",
        );
        if (!caveat) return sum;
        const val = caveat.caveatValue as Record<string, unknown>;
        const weiStr = String(val.maxAmount ?? val.amount ?? "0");
        return sum + BigInt(weiStr);
      }, 0n);
    } catch {
      return 0n;
    }
  })();

  const remainingWei = approvedWei > redelegatedWei ? approvedWei - redelegatedWei : 0n;

  function formatEthTrimmed(wei: bigint) {
    const s = formatEther(wei);
    if (!s.includes(".")) return s;
    return s.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
  }

  const handleSmartAccountActivated = (smartAccountAddress: string | null) => {
    if (!smartAccountAddress) return;

    setDashboardState((current) => {
      if (!current) return current;
      return {
        ...current,
        employee: { ...current.employee, smartAccountAddress },
      };
    });
  };

  return (
    <DashboardShell
      companyName={company.name}
      smartAccountLabel={smartAccountLabel}
      title="Employee dashboard"
      roleLabel="Employee"
      role="employee"
    >
      <div className="flex flex-col gap-6">
        {/* Smart account activation banner (shown while not yet activated) */}
        {!employee.smartAccountAddress && (
          <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Smart account not yet activated
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Activate your smart account so the company can delegate spending authority to you.
              </p>
            </div>
            <SmartAccountActivationButton
              walletAddress={address}
              existingSmartAccountAddress={employee.smartAccountAddress}
              onActivated={(result) =>
                handleSmartAccountActivated(result.smartAccountAddress)
              }
            />
          </div>
        )}

        {/* Summary cards */}
        <EmployeeSectionCards
          approvedLimitEth={summary.approvedLimitEth}
          redelegatedEth={summary.redelegatedEth}
          activeAgentCount={summary.activeAgentCount}
          remainingEth={formatEthTrimmed(remainingWei)}
        />

        {/* Canvas */}
        <EmployeeFlowCanvas
          dashboardState={dashboardState}
          onConfigureDelegation={(delegationId) => {
            // TODO: open caveat drawer for this delegation (Phase 5 detail)
            console.log("configure delegation", delegationId);
          }}
          onRevokeDelegation={(delegationId) => {
            // TODO: wire up revoke server action (Phase 5 detail)
            console.log("revoke delegation", delegationId);
          }}
        />
      </div>
    </DashboardShell>
  );
}
