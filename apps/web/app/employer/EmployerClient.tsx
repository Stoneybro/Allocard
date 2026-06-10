"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useBalance } from "wagmi";
import { hashDelegation } from "@metamask/delegation-core";
import {
  createDelegation,
  getSmartAccountsEnvironment,
  ScopeType,
  type Caveat,
  type Caveats,
  type Delegation,
} from "@metamask/smart-accounts-kit";
import { LoaderCircleIcon, ShieldCheckIcon, BotIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseEther, formatEther, type Hex } from "viem";
import {
  activateDelegation,
  createAgentDelegation,
  createCompanyInvite,
  createEmployeeDelegation,
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import { formatWalletAddress } from "@/lib/wallet";

type DelegationRow = CompanyDashboardState["delegations"][number];
type CaveatForm = {
  maxAmountEth: string;
  period: "none" | "hourly" | "daily" | "weekly" | "monthly";
  periodAmountEth: string;
  perTransactionCapEth: string;
  allowedTargets: string;
  limitedCallsEnabled: boolean;
  limitedCalls: string;
  policyPrompt: string;
};

const emptyCaveatForm: CaveatForm = {
  maxAmountEth: "0.01",
  period: "none",
  periodAmountEth: "",
  perTransactionCapEth: "",
  allowedTargets: "",
  limitedCallsEnabled: false,
  limitedCalls: "1",
  policyPrompt: "",
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

    if (caveat.caveatType === "limitedCalls") {
      nextForm.limitedCallsEnabled = true;
      nextForm.limitedCalls =
        typeof value.limit === "number" ? String(value.limit) : "1";
    }
  }

  nextForm.policyPrompt = delegation.policyPrompt ?? "";

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

function formatAllowanceEth(wei: string): string {
  try {
    const formatted = formatEther(BigInt(wei));
    // Trim trailing zeros: "0.010000000000000000" -> "0.01"
    return formatted.replace(/(\.[0-9]*?)0+$/, "$1").replace(/\.$/, "");
  } catch {
    return wei;
  }
}

function formatDelegationStatus(status: string) {
  switch (status) {
    case "pending_config": return "Pending Configuration";
    case "active": return "Active";
    case "revoked": return "Revoked";
    default: return status;
  }
}

function buildServerCaveats(form: CaveatForm) {
  return {
    maxAmountEth: form.maxAmountEth,
    period: form.period,
    periodAmountEth: form.periodAmountEth || form.maxAmountEth,
    perTransactionCapEth: form.perTransactionCapEth,
    allowedTargets: splitAddresses(form.allowedTargets),
    redeemers: [],
    limitedCalls: form.limitedCallsEnabled ? Number(form.limitedCalls) : null,
    customCaveats: [],
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

  if (form.limitedCallsEnabled) {
    caveats.push({ type: "limitedCalls", limit: Number(form.limitedCalls) });
  }

  return caveats;
}

const ETH_AMOUNT_RE = /^\d+(\.\d+)?$/;
const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

type FormErrors = {
  maxAmountEth?: string;
  periodAmountEth?: string;
  perTransactionCapEth?: string;
  limitedCalls?: string;
  allowedTargets?: string;
  allowedTargetsWarning?: string;
};

function validateCaveatForm(
  form: CaveatForm,
  availableBalanceEth: number | null,
): FormErrors {
  const errors: FormErrors = {};

  // --- Lifetime Spending Limit ---
  if (!ETH_AMOUNT_RE.test(form.maxAmountEth.trim())) {
    errors.maxAmountEth = "Enter a valid ETH amount (e.g. 0.05).";
  } else {
    const max = parseFloat(form.maxAmountEth);
    if (max <= 0) {
      errors.maxAmountEth = "Spending limit must be greater than 0.";
    } else if (availableBalanceEth !== null && max > availableBalanceEth) {
      errors.maxAmountEth = `Exceeds available balance. Max you can delegate: ${availableBalanceEth.toFixed(6)} ETH.`;
    }
  }

  // --- Periodic Allowance ---
  if (form.period !== "none") {
    const raw = form.periodAmountEth.trim();
    if (!raw) {
      errors.periodAmountEth = "Enter a period allowance when a recurring period is selected.";
    } else if (!ETH_AMOUNT_RE.test(raw)) {
      errors.periodAmountEth = "Enter a valid ETH amount (e.g. 0.01).";
    } else {
      const period = parseFloat(raw);
      const max = parseFloat(form.maxAmountEth);
      if (period <= 0) {
        errors.periodAmountEth = "Period allowance must be greater than 0.";
      } else if (!errors.maxAmountEth && period > max) {
        errors.periodAmountEth = `Period allowance (${raw} ETH) cannot exceed the lifetime limit (${form.maxAmountEth} ETH).`;
      }
    }
  }

  // --- Per-Transaction Cap ---
  const perTxRaw = form.perTransactionCapEth.trim();
  if (perTxRaw) {
    if (!ETH_AMOUNT_RE.test(perTxRaw)) {
      errors.perTransactionCapEth = "Enter a valid ETH amount (e.g. 0.005).";
    } else {
      const perTx = parseFloat(perTxRaw);
      if (perTx <= 0) {
        errors.perTransactionCapEth = "Per-transaction cap must be greater than 0.";
      } else {
        const ceiling =
          form.period !== "none" && form.periodAmountEth.trim()
            ? parseFloat(form.periodAmountEth)
            : parseFloat(form.maxAmountEth);
        if (!isNaN(ceiling) && perTx > ceiling) {
          const label = form.period !== "none" ? `the period allowance (${form.periodAmountEth} ETH)` : `the lifetime limit (${form.maxAmountEth} ETH)`;
          errors.perTransactionCapEth = `Per-transaction cap cannot exceed ${label}.`;
        }
      }
    }
  }

  // --- Limited Calls ---
  if (form.limitedCallsEnabled) {
    const n = Number(form.limitedCalls);
    if (!Number.isInteger(n) || n < 1) {
      errors.limitedCalls = "Transaction limit must be a whole number ≥ 1.";
    }
  }

  // --- Address Whitelist ---
  const addresses = splitAddresses(form.allowedTargets);
  const invalidAddresses = addresses.filter((a) => !ETH_ADDRESS_RE.test(a));
  if (invalidAddresses.length > 0) {
    errors.allowedTargets = `Invalid address${invalidAddresses.length > 1 ? "es" : ""}: ${invalidAddresses.join(", ")}`;
  } else if (addresses.length === 0) {
    errors.allowedTargetsWarning = "No addresses specified — the delegatee can send to any address.";
  }

  return errors;
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
  const [formErrors, setFormErrors] = useState<FormErrors>({});
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

  const { data: ethBalanceData } = useBalance({
    address: company?.smartAccountAddress as `0x${string}` | undefined,
    query: { enabled: Boolean(company?.smartAccountAddress), refetchInterval: 15_000 },
  });

  const ethBalance = ethBalanceData
    ? (() => {
        const raw = formatEther(ethBalanceData.value);
        const trimmed = raw.includes(".")
          ? raw.replace(/(\.[0-9]{1,4}?)0*$/, "$1").replace(/\.$/, "")
          : raw;
        return trimmed || "0";
      })()
    : undefined;

  // Available balance = master balance minus the sum of all *other* active delegations' limits.
  const availableBalanceEth = useMemo(() => {
    if (ethBalance === undefined || !dashboardState) return null;
    const masterEth = parseFloat(ethBalance);
    if (isNaN(masterEth)) return null;
    const alreadyDelegated = dashboardState.delegations
      .filter(
        (d) => d.status === "active" && d.id !== selectedDelegationId,
      )
      .reduce((sum, d) => {
        const caveat = d.caveats.find((c) => c.caveatType === "nativeTokenTransferAmount");
        if (!caveat) return sum;
        const val = caveat.caveatValue as Record<string, unknown>;
        const weiStr = String(val.maxAmount ?? val.amount ?? "");
        if (!weiStr) return sum;
        try { return sum + parseFloat(formatEther(BigInt(weiStr))); } catch { return sum; }
      }, 0);
    return Math.max(0, masterEth - alreadyDelegated);
  }, [ethBalance, dashboardState, selectedDelegationId]);
  const selectedDelegation = useMemo(
    () =>
      dashboardState?.delegations.find(
        (delegation) => delegation.id === selectedDelegationId,
      ) ?? null,
    [dashboardState?.delegations, selectedDelegationId],
  );

  const canvasEmployees = useMemo(
    () =>
      dashboardState?.employees.map((employee) => ({
        id: employee.id,
        label: formatWalletAddress(employee.walletAddress),
        smartAccountAddress: employee.smartAccountAddress,
      })) ?? [],
    [dashboardState?.employees],
  );

  // Extract the configured spending allowance for each delegation from its caveats.
  const canvasDelegations = useMemo(() => {
    if (!dashboardState) return [];
    return dashboardState.delegations.map((delegation) => {
      const allowanceCaveat = delegation.caveats.find(
        (c) => c.caveatType === "nativeTokenTransferAmount",
      );
      let allowance: string | undefined;
      if (allowanceCaveat) {
        const val = allowanceCaveat.caveatValue as Record<string, unknown>;
        const weiStr = String(val.maxAmount ?? val.amount ?? "");
        if (weiStr) allowance = formatAllowanceEth(weiStr);
      }
      return { ...delegation, allowance };
    });
  }, [dashboardState]);

  const canvasCompany = useMemo(
    () => (company ? { ...company, ethBalance } : null),
    [company, ethBalance],
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
      setFormErrors({});
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

  const handleRevokeDelegation = useCallback(
    (delegationId: string) => {
      runDashboardMutation(() =>
        revokeDelegation({
          walletAddress: address as string,
          delegationId,
        }),
      );
    },
    [address, runDashboardMutation],
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
    if (delegation.delegateeType === "user" && delegation.delegateeId) {
      const employee = dashboardState.employees.find(
        (item) => item.id === delegation.delegateeId,
      );

      if (!employee?.smartAccountAddress) {
        throw new Error("The employee smart account must be activated first");
      }

      return employee.smartAccountAddress as `0x${string}`;
    }

    if (delegation.delegateeType === "agent" && delegation.delegateeId) {
      const agent = dashboardState.agents.find(
        (item) => item.id === delegation.delegateeId,
      );

      if (!agent?.smartAccountAddress) {
        throw new Error("The agent smart account is not configured yet");
      }

      return agent.smartAccountAddress as `0x${string}`;
    }

    throw new Error("Delegation target is incomplete");
  };

  const handleActivateDelegation = () => {
    if (!selectedDelegation) return;

    const errors = validateCaveatForm(caveatForm, availableBalanceEth);
    setFormErrors(errors);
    const hasErrors = Object.keys(errors).some(
      (k) => k !== "allowedTargetsWarning" && errors[k as keyof FormErrors],
    );
    if (hasErrors) return;

    setError(null);
    startTransition(async () => {
      try {
        const savedState = await saveDelegationCaveats({
          walletAddress: address,
          delegationId: selectedDelegation.id,
          caveats: buildServerCaveats(caveatForm),
          policyPrompt: caveatForm.policyPrompt,
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
      employees={dashboardState.employees.map((employee) => ({
        id: employee.id,
        label: formatWalletAddress(employee.walletAddress),
        detail: employee.smartAccountAddress
          ? formatWalletAddress(employee.smartAccountAddress)
          : "Smart account pending",
      }))}
      agents={dashboardState.agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        detail: agent.description ?? "Platform AI agent",
      }))}
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
          company={canvasCompany ?? company}
          employees={canvasEmployees}
          agents={dashboardState.agents.map((agent) => ({
            id: agent.id,
            name: agent.name,
            smartAccountAddress: agent.smartAccountAddress,
          }))}
          delegations={canvasDelegations}
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
          onDropAgent={({ agentId, canvasPositionX, canvasPositionY }) =>
            runDashboardMutation(() =>
              createAgentDelegation({
                walletAddress: address,
                agentId,
                canvasPositionX,
                canvasPositionY,
              }),
            )
          }
          onMoveDelegation={handleMoveDelegation}
          onRevokeDelegation={handleRevokeDelegation}
        />
      </div>

      <Drawer
        direction="right"
        open={Boolean(selectedDelegation)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDelegationId(null);
            setFormErrors({});
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Spending Limits & Rules</DrawerTitle>
            <DrawerDescription>
              {selectedDelegation?.status === "active" 
                ? "These rules are currently active and enforced on-chain."
                : "Configure exactly what this delegatee is allowed to do with the company's funds."}
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-2">
            {selectedDelegation ? (
              <div>
                <Badge 
                  variant={selectedDelegation.status === "active" ? "secondary" : "outline"} 
                  className="mb-2"
                >
                  {formatDelegationStatus(selectedDelegation.status)}
                </Badge>
              </div>
            ) : null}

            {/* Section 1: Overall Spending Limits */}
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-semibold text-foreground">1. Overall Spending Limits</h4>
              
              <div className="flex flex-col gap-2">
                <Label htmlFor="max-amount">Lifetime Spending Limit (ETH)</Label>
                <Input
                  id="max-amount"
                  value={caveatForm.maxAmountEth}
                  className={formErrors.maxAmountEth ? "border-destructive" : ""}
                  disabled={selectedDelegation?.status === "active"}
                  onChange={(event) =>
                    setCaveatForm((form) => ({
                      ...form,
                      maxAmountEth: event.target.value,
                    }))
                  }
                />
                {formErrors.maxAmountEth ? (
                  <p className="text-[0.8rem] text-destructive">{formErrors.maxAmountEth}</p>
                ) : (
                  <p className="text-[0.8rem] text-muted-foreground">The absolute maximum amount of ETH this delegatee can spend in total over the lifetime of this delegation.</p>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <Label>Recurring Allowance</Label>
                <Select
                  value={caveatForm.period}
                  disabled={selectedDelegation?.status === "active"}
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
                <p className="text-[0.8rem] text-muted-foreground">Automatically reset their spending limit on a recurring schedule.</p>
              </div>

              {caveatForm.period !== "none" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="period-amount">Allowance per Period (ETH)</Label>
                  <Input
                    id="period-amount"
                    value={caveatForm.periodAmountEth}
                    className={formErrors.periodAmountEth ? "border-destructive" : ""}
                    disabled={selectedDelegation?.status === "active"}
                    onChange={(event) =>
                      setCaveatForm((form) => ({
                        ...form,
                        periodAmountEth: event.target.value,
                      }))
                    }
                  />
                  {formErrors.periodAmountEth ? (
                    <p className="text-[0.8rem] text-destructive">{formErrors.periodAmountEth}</p>
                  ) : (
                    <p className="text-[0.8rem] text-muted-foreground">How much they can spend within the selected timeframe.</p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Section 2: Transaction Restrictions */}
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-semibold text-foreground">2. Transaction Restrictions</h4>
              
              <div className="flex flex-col gap-2">
                <Label htmlFor="value-lte">Maximum Per-Transaction (ETH)</Label>
                <Input
                  id="value-lte"
                  value={caveatForm.perTransactionCapEth}
                  className={formErrors.perTransactionCapEth ? "border-destructive" : ""}
                  disabled={selectedDelegation?.status === "active"}
                  onChange={(event) =>
                    setCaveatForm((form) => ({
                      ...form,
                      perTransactionCapEth: event.target.value,
                    }))
                  }
                />
                {formErrors.perTransactionCapEth ? (
                  <p className="text-[0.8rem] text-destructive">{formErrors.perTransactionCapEth}</p>
                ) : (
                  <p className="text-[0.8rem] text-muted-foreground">The most they can spend in any single transaction. Leave blank for no per-transaction cap.</p>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="limited-calls-enabled"
                    checked={caveatForm.limitedCallsEnabled}
                    disabled={selectedDelegation?.status === "active"}
                    onCheckedChange={(checked) =>
                      setCaveatForm((form) => ({
                        ...form,
                        limitedCallsEnabled: checked === true,
                      }))
                    }
                  />
                  <Label htmlFor="limited-calls-enabled">Limit Total Transactions</Label>
                </div>
                {caveatForm.limitedCallsEnabled && (
                  <>
                    <Input
                      value={caveatForm.limitedCalls}
                      disabled={selectedDelegation?.status === "active"}
                      onChange={(event) =>
                        setCaveatForm((form) => ({
                          ...form,
                          limitedCalls: event.target.value,
                        }))
                      }
                      className={cn("mt-1", formErrors.limitedCalls ? "border-destructive" : "")}
                    />
                    {formErrors.limitedCalls ? (
                      <p className="text-[0.8rem] text-destructive">{formErrors.limitedCalls}</p>
                    ) : (
                      <p className="text-[0.8rem] text-muted-foreground">Restrict the delegatee to a specific number of total transactions.</p>
                    )}
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Section 3: Target & Address Restrictions */}
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-semibold text-foreground">3. Address Whitelist</h4>
              
              <div className="flex flex-col gap-2">
                <Label htmlFor="targets">Permitted Addresses</Label>
                <Input
                  id="targets"
                  value={caveatForm.allowedTargets}
                  className={formErrors.allowedTargets ? "border-destructive" : ""}
                  disabled={selectedDelegation?.status === "active"}
                  onChange={(event) =>
                    setCaveatForm((form) => ({
                      ...form,
                      allowedTargets: event.target.value,
                    }))
                  }
                  placeholder="One address per line or comma-separated"
                />
                {formErrors.allowedTargets ? (
                  <p className="text-[0.8rem] text-destructive">{formErrors.allowedTargets}</p>
                ) : formErrors.allowedTargetsWarning ? (
                  <p className="text-[0.8rem] text-amber-500">{formErrors.allowedTargetsWarning}</p>
                ) : (
                  <p className="text-[0.8rem] text-muted-foreground">Only allow sends to these addresses. Leave blank to allow any destination (less secure).</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Section 4: AI Policy Prompt */}
            {selectedDelegation?.delegateeType === "agent" && (
              <div className="flex flex-col gap-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BotIcon className="h-4 w-4 text-chart-5" />
                  4. AI Policy Prompt
                </h4>
                
                <div className="flex flex-col gap-2">
                  <Label htmlFor="policy-prompt">Natural Language Rules</Label>
                  <Textarea
                    id="policy-prompt"
                    value={caveatForm.policyPrompt}
                    disabled={selectedDelegation?.status === "active"}
                    onChange={(event) =>
                      setCaveatForm((form) => ({
                        ...form,
                        policyPrompt: event.target.value,
                      }))
                    }
                    placeholder="e.g. Do not reimburse alcohol. Limit meals to $50. Flights must be economy."
                    className="min-h-[100px] resize-none"
                  />
                  <p className="text-[0.8rem] text-muted-foreground">These rules will be fed to the AI Agent to evaluate claims. The hard on-chain limits above still apply as a security net.</p>
                </div>
              </div>
            )}
            
            <div className="pb-4"></div>
          </div>
          {selectedDelegation?.status !== "active" && (
            <DrawerFooter className="border-t pt-4">
              <Button onClick={handleActivateDelegation} disabled={isPending}>
                {isPending ? (
                  <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <ShieldCheckIcon data-icon="inline-start" />
                )}
                Activate delegation
              </Button>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    </DashboardShell>
  );
}
