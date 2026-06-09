"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { hashDelegation } from "@metamask/delegation-core";
import {
  createCaveat,
  createDelegation,
  getSmartAccountsEnvironment,
  ScopeType,
  type Caveat,
  type Caveats,
  type Delegation,
} from "@metamask/smart-accounts-kit";
import { LoaderCircleIcon, ShieldCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseEther, type Hex } from "viem";
import {
  activateDelegation,
  createCompanyInvite,
  createEmployeeDelegation,
  createEoaDelegation,
  getCompanyDashboardState,
  getWalletProfile,
  revokeDelegation,
  saveDelegationCaveats,
  updateDelegationPosition,
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
import { SmartAccountActivationButton } from "@/components/smart-account-activation-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createInjectedWalletClient } from "@/lib/signer";
import { createHybridSmartAccount } from "@/lib/smartAccount";
import { formatWalletAddress } from "@/lib/wallet";

type DelegationRow = CompanyDashboardState["delegations"][number];
type CaveatForm = {
  maxAmountEth: string;
  period: "none" | "hourly" | "daily" | "weekly" | "monthly";
  periodAmountEth: string;
  perTransactionCapEth: string;
  allowedTargets: string;
  redeemers: string;
  limitedCallsEnabled: boolean;
  limitedCalls: string;
  customEnforcer: string;
  customTerms: string;
  customArgs: string;
};

const emptyCaveatForm: CaveatForm = {
  maxAmountEth: "0.01",
  period: "none",
  periodAmountEth: "",
  perTransactionCapEth: "",
  allowedTargets: "",
  redeemers: "",
  limitedCallsEnabled: false,
  limitedCalls: "1",
  customEnforcer: "",
  customTerms: "0x",
  customArgs: "0x",
};

const periodDurations = {
  hourly: 60 * 60,
  daily: 60 * 60 * 24,
  weekly: 60 * 60 * 24 * 7,
  monthly: 60 * 60 * 24 * 30,
} as const;

function splitAddresses(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function caveatRecord(caveat: DelegationRow["caveats"][number]) {
  return caveat.caveatValue && typeof caveat.caveatValue === "object"
    ? (caveat.caveatValue as Record<string, unknown>)
    : {};
}

function formFromDelegation(delegation: DelegationRow | null): CaveatForm {
  if (!delegation) return emptyCaveatForm;

  const nextForm = { ...emptyCaveatForm };

  for (const caveat of delegation.caveats) {
    const value = caveatRecord(caveat);

    if (caveat.caveatType === "nativeTokenTransferAmount") {
      const wei = value.maxAmount ?? value.amount;
      nextForm.maxAmountEth = typeof wei === "string" ? weiToEthInput(wei) : "";
    }

    if (caveat.caveatType === "nativeTokenPeriodTransfer") {
      const period = value.period;
      const amount = value.periodAmount ?? value.amount;
      nextForm.period =
        period === "hourly" ||
        period === "daily" ||
        period === "weekly" ||
        period === "monthly"
          ? period
          : "daily";
      nextForm.periodAmountEth =
        typeof amount === "string" ? weiToEthInput(amount) : "";
    }

    if (caveat.caveatType === "valueLte") {
      const maxValue = value.maxValue ?? value.valueWei;
      nextForm.perTransactionCapEth =
        typeof maxValue === "string" ? weiToEthInput(maxValue) : "";
    }

    if (caveat.caveatType === "allowedTargets" && Array.isArray(value.targets)) {
      nextForm.allowedTargets = value.targets.join("\n");
    }

    if (caveat.caveatType === "redeemer" && Array.isArray(value.redeemers)) {
      nextForm.redeemers = value.redeemers.join("\n");
    }

    if (caveat.caveatType === "limitedCalls") {
      nextForm.limitedCallsEnabled = true;
      nextForm.limitedCalls =
        typeof value.limit === "number" ? String(value.limit) : "1";
    }

    if (caveat.caveatType === "custom") {
      nextForm.customEnforcer =
        typeof value.enforcer === "string" ? value.enforcer : "";
      nextForm.customTerms =
        typeof value.terms === "string" ? value.terms : "0x";
      nextForm.customArgs = typeof value.args === "string" ? value.args : "0x";
    }
  }

  return nextForm;
}

function weiToEthInput(wei: string) {
  const value = BigInt(wei);
  const whole = value / 1_000_000_000_000_000_000n;
  const fractional = value % 1_000_000_000_000_000_000n;

  if (fractional === 0n) {
    return whole.toString();
  }

  return `${whole}.${fractional.toString().padStart(18, "0").replace(/0+$/, "")}`;
}

function buildServerCaveats(form: CaveatForm) {
  return {
    maxAmountEth: form.maxAmountEth,
    period: form.period,
    periodAmountEth: form.periodAmountEth || form.maxAmountEth,
    perTransactionCapEth: form.perTransactionCapEth,
    allowedTargets: splitAddresses(form.allowedTargets),
    redeemers: splitAddresses(form.redeemers),
    limitedCalls: form.limitedCallsEnabled ? Number(form.limitedCalls) : null,
    customCaveats: form.customEnforcer.trim()
      ? [
          {
            enforcer: form.customEnforcer,
            terms: form.customTerms || "0x",
            args: form.customArgs || "0x",
          },
        ]
      : [],
  };
}

function buildSdkCaveats(form: CaveatForm) {
  const caveats: Caveats = [];

  if (form.period !== "none") {
    caveats.push({
      type: "nativeTokenPeriodTransfer",
      periodAmount: parseEther(form.periodAmountEth || form.maxAmountEth),
      periodDuration: periodDurations[form.period],
      startDate: Math.floor(Date.now() / 1000),
    });
  }

  if (form.perTransactionCapEth.trim()) {
    caveats.push({
      type: "valueLte",
      maxValue: parseEther(form.perTransactionCapEth),
    });
  }

  const allowedTargets = splitAddresses(form.allowedTargets) as `0x${string}`[];

  if (allowedTargets.length > 0) {
    caveats.push({ type: "allowedTargets", targets: allowedTargets });
  }

  const redeemers = splitAddresses(form.redeemers) as `0x${string}`[];

  if (redeemers.length > 0) {
    caveats.push({ type: "redeemer", redeemers });
  }

  if (form.limitedCallsEnabled) {
    caveats.push({ type: "limitedCalls", limit: Number(form.limitedCalls) });
  }

  if (form.customEnforcer.trim()) {
    caveats.push(
      createCaveat(
        form.customEnforcer as Hex,
        (form.customTerms || "0x") as Hex,
        (form.customArgs || "0x") as Hex,
      ),
    );
  }

  return caveats;
}

function toCoreDelegation(delegation: Delegation) {
  return {
    ...delegation,
    salt: BigInt(delegation.salt),
  };
}

function toSignedDelegationJson(delegation: Delegation) {
  return {
    ...delegation,
    caveats: delegation.caveats.map((caveat: Caveat) => ({ ...caveat })),
  };
}

export function EmployerClient() {
  const router = useRouter();
  const { address, isConnected } = useConnectedWalletAddress();
  const [profile, setProfile] = useState<WalletProfile | null>(null);
  const [dashboardState, setDashboardState] =
    useState<CompanyDashboardState | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDelegationId, setSelectedDelegationId] = useState<string | null>(
    null,
  );
  const [caveatForm, setCaveatForm] = useState<CaveatForm>(emptyCaveatForm);
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
  const smartAccountLabel = company?.smartAccountAddress
    ? formatWalletAddress(company.smartAccountAddress)
    : "Smart account pending";
  const selectedDelegation = useMemo(
    () =>
      dashboardState?.delegations.find(
        (delegation) => delegation.id === selectedDelegationId,
      ) ?? null,
    [dashboardState?.delegations, selectedDelegationId],
  );

  const canvasEmployees = useMemo(
    () =>
      dashboardState?.employees.map((employee, index) => ({
        id: employee.id,
        label: `Employee ${index + 1}`,
        smartAccountAddress: employee.smartAccountAddress,
      })) ?? [],
    [dashboardState?.employees],
  );

  const updateDashboard = useCallback((state: CompanyDashboardState) => {
    setDashboardState(state);
  }, []);

  const runDashboardMutation = useCallback(
    (mutation: () => Promise<CompanyDashboardState>) => {
      setError(null);
      startTransition(async () => {
        try {
          updateDashboard(await mutation());
        } catch (caughtError) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Dashboard update failed",
          );
        }
      });
    },
    [updateDashboard],
  );

  const handleConfigureDelegation = useCallback(
    (delegationId: string) => {
      const delegation =
        dashboardState?.delegations.find((item) => item.id === delegationId) ??
        null;

      setSelectedDelegationId(delegationId);
      setCaveatForm(formFromDelegation(delegation));
    },
    [dashboardState?.delegations],
  );

  const handleDropEmployee = useCallback(
    (input: {
      employeeId: string;
      canvasPositionX: number;
      canvasPositionY: number;
    }) =>
      runDashboardMutation(() =>
        createEmployeeDelegation({ walletAddress: address ?? "", ...input }),
      ),
    [runDashboardMutation, address],
  );

  const handleMoveDelegation = useCallback(
    (input: {
      delegationId: string;
      canvasPositionX: number;
      canvasPositionY: number;
    }) =>
      runDashboardMutation(() =>
        updateDelegationPosition({ walletAddress: address ?? "", ...input }),
      ),
    [runDashboardMutation, address],
  );

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
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not create invite",
        );
      }
    });
  };

  const handleCopyInvite = async () => {
    if (!inviteLink) return;

    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
  };

  const handleSmartAccountActivated = (smartAccountAddress: string | null) => {
    if (!smartAccountAddress) return;

    setProfile((currentProfile) => {
      if (!currentProfile || currentProfile.status !== "employer") {
        return currentProfile;
      }

      return {
        ...currentProfile,
        company: currentProfile.company
          ? { ...currentProfile.company, smartAccountAddress }
          : currentProfile.company,
      };
    });
    setDashboardState((currentState) =>
      currentState
        ? {
            ...currentState,
            company: { ...currentState.company, smartAccountAddress },
          }
        : currentState,
    );
  };

  const resolveDelegateAddress = (delegation: DelegationRow) => {
    if (delegation.delegateeType === "eoa" && delegation.delegateeAddress) {
      return delegation.delegateeAddress as `0x${string}`;
    }

    if (delegation.delegateeType === "user" && delegation.delegateeId) {
      const employee = dashboardState.employees.find(
        (item) => item.id === delegation.delegateeId,
      );

      if (!employee?.smartAccountAddress) {
        throw new Error("The employee smart account must be activated first");
      }

      return employee.smartAccountAddress as `0x${string}`;
    }

    throw new Error("Delegation target is incomplete");
  };

  const handleSaveCaveats = () => {
    if (!selectedDelegation) return;

    runDashboardMutation(() =>
      saveDelegationCaveats({
        walletAddress: address,
        delegationId: selectedDelegation.id,
        caveats: buildServerCaveats(caveatForm),
      }),
    );
  };

  const handleActivateDelegation = () => {
    if (!selectedDelegation) return;

    setError(null);
    startTransition(async () => {
      try {
        const savedState = await saveDelegationCaveats({
          walletAddress: address,
          delegationId: selectedDelegation.id,
          caveats: buildServerCaveats(caveatForm),
        });
        updateDashboard(savedState);

        if (!company.smartAccountAddress) {
          throw new Error("Activate the company smart account first");
        }

        const walletClient = createInjectedWalletClient(address);
        const smartAccount = await createHybridSmartAccount(walletClient);
        const environment = getSmartAccountsEnvironment(84532);
        const sdkCaveats = buildSdkCaveats(caveatForm);
        const delegation = createDelegation({
          environment,
          from: company.smartAccountAddress as Hex,
          to: resolveDelegateAddress(selectedDelegation),
          scope: {
            type: ScopeType.NativeTokenTransferAmount,
            maxAmount: parseEther(caveatForm.maxAmountEth),
          },
          caveats: sdkCaveats,
        });
        const signature = await smartAccount.signDelegation({
          delegation,
          chainId: 84532,
        });
        const signedDelegation = { ...delegation, signature };
        const delegationHash = hashDelegation(toCoreDelegation(signedDelegation));

        updateDashboard(
          await activateDelegation({
            walletAddress: address,
            delegationId: selectedDelegation.id,
            delegationHash,
            signedDelegation: toSignedDelegationJson(signedDelegation),
          }),
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not activate delegation",
        );
      }
    });
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
      agents={[]}
      eoaPending={isPending}
      inviteError={error}
      inviteLink={inviteLink}
      invitePending={isPending}
      onAddEmployee={(employeeId) =>
        runDashboardMutation(() =>
          createEmployeeDelegation({
            walletAddress: address,
            employeeId,
            canvasPositionX: 420,
            canvasPositionY: 120 + dashboardState.delegations.length * 90,
          }),
        )
      }
      onAddEoa={(input) =>
        runDashboardMutation(() =>
          createEoaDelegation({
            walletAddress: address,
            delegateeAddress: input.address,
            delegateeLabel: input.label,
            canvasPositionX: 760,
            canvasPositionY: 120 + dashboardState.delegations.length * 90,
          }),
        )
      }
      onCopyInvite={handleCopyInvite}
      onCreateInvite={handleCreateInvite}
      roleLabel="Company owner"
      smartAccountLabel={smartAccountLabel}
      title="Company dashboard"
    >
      <div className="flex min-h-full flex-col gap-4">
        <SectionCards
          employeeCount={dashboardState.summary.employeeCount}
          activeAgentCount={0}
          activeDelegationCount={dashboardState.summary.activeDelegationCount}
          delegatedNativeEthAllowance={
            dashboardState.summary.delegatedNativeEthAllowance
          }
        />
        <DashboardFlowCanvas
          company={company}
          employees={canvasEmployees}
          delegations={dashboardState.delegations}
          headerAction={
            <SmartAccountActivationButton
              walletAddress={address}
              existingSmartAccountAddress={company.smartAccountAddress}
              onActivated={(result) =>
                handleSmartAccountActivated(result.smartAccountAddress)
              }
            />
          }
          onConfigureDelegation={handleConfigureDelegation}
          onDropEmployee={handleDropEmployee}
          onMoveDelegation={handleMoveDelegation}
        />
      </div>

      <Drawer
        direction="right"
        open={Boolean(selectedDelegation)}
        onOpenChange={(open) => {
          if (!open) setSelectedDelegationId(null);
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Delegation caveats</DrawerTitle>
            <DrawerDescription>
              Configure and sign this spending authority.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
            {selectedDelegation ? (
              <Badge variant="outline">{selectedDelegation.status}</Badge>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="max-amount">Maximum native ETH</Label>
              <Input
                id="max-amount"
                value={caveatForm.maxAmountEth}
                onChange={(event) =>
                  setCaveatForm((form) => ({
                    ...form,
                    maxAmountEth: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Period</Label>
              <Select
                value={caveatForm.period}
                onValueChange={(period) =>
                  setCaveatForm((form) => ({
                    ...form,
                    period: period as CaveatForm["period"],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="period-amount">Period amount</Label>
              <Input
                id="period-amount"
                value={caveatForm.periodAmountEth}
                onChange={(event) =>
                  setCaveatForm((form) => ({
                    ...form,
                    periodAmountEth: event.target.value,
                  }))
                }
                disabled={caveatForm.period === "none"}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="value-lte">Per-transaction cap</Label>
              <Input
                id="value-lte"
                value={caveatForm.perTransactionCapEth}
                onChange={(event) =>
                  setCaveatForm((form) => ({
                    ...form,
                    perTransactionCapEth: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="targets">Allowed targets</Label>
              <Input
                id="targets"
                value={caveatForm.allowedTargets}
                onChange={(event) =>
                  setCaveatForm((form) => ({
                    ...form,
                    allowedTargets: event.target.value,
                  }))
                }
                placeholder="Comma-separated addresses"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="redeemers">Redeemers</Label>
              <Input
                id="redeemers"
                value={caveatForm.redeemers}
                onChange={(event) =>
                  setCaveatForm((form) => ({
                    ...form,
                    redeemers: event.target.value,
                  }))
                }
                placeholder="Comma-separated addresses"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="limited-calls-enabled"
                checked={caveatForm.limitedCallsEnabled}
                onCheckedChange={(checked) =>
                  setCaveatForm((form) => ({
                    ...form,
                    limitedCallsEnabled: checked === true,
                  }))
                }
              />
              <Label htmlFor="limited-calls-enabled">Limit call count</Label>
            </div>
            <Input
              value={caveatForm.limitedCalls}
              onChange={(event) =>
                setCaveatForm((form) => ({
                  ...form,
                  limitedCalls: event.target.value,
                }))
              }
              disabled={!caveatForm.limitedCallsEnabled}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="custom-enforcer">Custom enforcer</Label>
              <Input
                id="custom-enforcer"
                value={caveatForm.customEnforcer}
                onChange={(event) =>
                  setCaveatForm((form) => ({
                    ...form,
                    customEnforcer: event.target.value,
                  }))
                }
              />
              <Input
                value={caveatForm.customTerms}
                onChange={(event) =>
                  setCaveatForm((form) => ({
                    ...form,
                    customTerms: event.target.value,
                  }))
                }
                placeholder="Terms hex"
              />
              <Input
                value={caveatForm.customArgs}
                onChange={(event) =>
                  setCaveatForm((form) => ({
                    ...form,
                    customArgs: event.target.value,
                  }))
                }
                placeholder="Args hex"
              />
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={handleSaveCaveats} disabled={isPending}>
              Save caveats
            </Button>
            <Button onClick={handleActivateDelegation} disabled={isPending}>
              {isPending ? (
                <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <ShieldCheckIcon data-icon="inline-start" />
              )}
              Activate delegation
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!selectedDelegation) return;
                runDashboardMutation(() =>
                  revokeDelegation({
                    walletAddress: address,
                    delegationId: selectedDelegation.id,
                  }),
                );
                setSelectedDelegationId(null);
              }}
              disabled={isPending || !selectedDelegation}
            >
              Revoke
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </DashboardShell>
  );
}
