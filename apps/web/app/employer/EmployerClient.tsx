"use client";

import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useBalance, useWalletClient } from "wagmi";
import { hashDelegation } from "@metamask/delegation-core";
import {
  createDelegation,
  getSmartAccountsEnvironment,
  ScopeType,
  type Caveat,
  type Caveats,
  type Delegation,
} from "@metamask/smart-accounts-kit";
import {
  LoaderCircleIcon,
  ShieldCheckIcon,
  BotIcon,
  ExternalLink,
  BanIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseEther, formatEther, parseUnits, type Hex } from "viem";
import { CHAIN_ID, TOKEN_SYMBOL, getAddressExplorerUrl, getTxExplorerUrl, AUSD_ADDRESS, AUSD_DECIMALS, ERC20_ABI } from "@/lib/chain";
import {
  updateCompanyPolicy,
  activateDelegation,
  createAgentDelegation,
  prepareReimbursementBudget,
  prepareAgoraRemittanceBudget,
  createEmployeeDelegation,
  addEmployeeByEmail,
  getCompanyDashboardState,
  getWalletProfile,
  setWorkspaceContext,
  removePendingDelegation,
  revokeDelegation,
  saveDelegationCaveats,
  updateDelegationPosition,
  type CompanyDashboardState,
  type WalletProfile,
} from "@/app/actions/identity";
import {
  ConnectRequiredCard,
} from "@/components/auth-state";
import { useAuth } from "@/components/AuthProvider";
import { DashboardFlowCanvas } from "@/components/dashboard-flow-canvas";
import { DashboardShell } from "@/components/dashboard-shell";
import { ReimbursementsCard } from "@/components/reimbursements-card";
import { isReimbursementAgent } from "@/lib/reimbursements/shared";
import { AgoraCrossBorderCard } from "@/components/agora-card";
import { isAgoraAgent } from "@/lib/agora/shared";
import { SectionCards } from "@/components/section-cards";
import { SmartAccountActivationButton } from "@/components/smart-account-activation-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_COMPANY_POLICY } from "@/lib/policy";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityLogTable } from "./ActivityLogTable";
import { createHybridSmartAccount } from "@/lib/smartAccount";
import { cn } from "@/lib/utils";
import { formatWalletAddress, generateEmployeeReferenceId } from "@/lib/wallet";

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
  maxAmountEth: "",
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
      type: "erc20PeriodTransfer",
      tokenAddress: AUSD_ADDRESS,
      periodAmount: parseUnits(form.periodAmountEth || form.maxAmountEth, AUSD_DECIMALS),
      periodDuration: periodDurations[form.period],
      startDate: Math.floor(Date.now() / 1000),
    });
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
    errors.maxAmountEth = `Enter a valid ${TOKEN_SYMBOL} amount (e.g. 0.05).`;
  } else {
    const max = parseFloat(form.maxAmountEth);
    if (max <= 0) {
      errors.maxAmountEth = "Spending limit must be greater than 0.";
    } else if (availableBalanceEth !== null) {
      try {
        const maxWei = parseEther(form.maxAmountEth);
        const availableWei = parseEther(availableBalanceEth.toString());
        if (maxWei > availableWei) {
          errors.maxAmountEth = `Exceeds available balance. Max you can delegate: ${availableBalanceEth} ${TOKEN_SYMBOL}.`;
        }
      } catch {
        // Fallback if parsing fails for some reason
        if (max > availableBalanceEth) {
          errors.maxAmountEth = `Exceeds available balance. Max you can delegate: ${availableBalanceEth} ${TOKEN_SYMBOL}.`;
        }
      }
    }
  }

  // --- Periodic Allowance ---
  if (form.period !== "none") {
    const raw = form.periodAmountEth.trim();
    if (!raw) {
      errors.periodAmountEth = "Enter a period allowance when a recurring period is selected.";
    } else if (!ETH_AMOUNT_RE.test(raw)) {
      errors.periodAmountEth = `Enter a valid ${TOKEN_SYMBOL} amount (e.g. 0.01).`;
    } else {
      const period = parseFloat(raw);
      const max = parseFloat(form.maxAmountEth);
      if (period <= 0) {
        errors.periodAmountEth = "Period allowance must be greater than 0.";
      } else if (!errors.maxAmountEth && period > max) {
        errors.periodAmountEth = `Period allowance (${raw} ${TOKEN_SYMBOL}) cannot exceed the lifetime limit (${form.maxAmountEth} ${TOKEN_SYMBOL}).`;
      }
    }
  }

  // --- Per-Transaction Cap ---
  const perTxRaw = form.perTransactionCapEth.trim();
  if (perTxRaw) {
    if (!ETH_AMOUNT_RE.test(perTxRaw)) {
      errors.perTransactionCapEth = `Enter a valid ${TOKEN_SYMBOL} amount (e.g. 0.005).`;
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
          const label = form.period !== "none" ? `the period allowance (${form.periodAmountEth} ${TOKEN_SYMBOL})` : `the lifetime limit (${form.maxAmountEth} ${TOKEN_SYMBOL})`;
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

export function EmployerClient({
  initialProfile,
  initialDashboardState,
}: {
  initialProfile?: WalletProfile | null;
  initialDashboardState?: CompanyDashboardState | null;
} = {}) {
  const router = useRouter();
  const auth = useAuth();
  const currentAuthAddress = auth.status === "authenticated" ? (auth.address as `0x${string}`) : undefined;
  const didLoadDashboard = useRef(Boolean(initialProfile && initialDashboardState));
  const [profile, setProfile] = useState<WalletProfile | null>(initialProfile ?? null);
  const [dashboardState, setDashboardState] =
    useState<CompanyDashboardState | null>(initialDashboardState ?? null);
  const [selectedDelegationId, setSelectedDelegationId] = useState<string | null>(
    null,
  );
  const [caveatForm, setCaveatForm] = useState<CaveatForm>(emptyCaveatForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [policyDraft, setPolicyDraft] = useState<string>(
    initialDashboardState?.companyPolicy ?? DEFAULT_COMPANY_POLICY,
  );
  const [policyHasChanges, setPolicyHasChanges] = useState(false);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    if (didLoadDashboard.current) {
      void auth.establishSession().catch(() => {});
      return;
    }
    didLoadDashboard.current = true;
    const addr = auth.address;

    startTransition(async () => {
      try {
        await auth.establishSession();
        const nextProfile = await getWalletProfile(addr);

        if (nextProfile.status === "new") {
          router.replace("/onboarding");
          return;
        }

        if (nextProfile.status === "picker") {
          router.replace("/onboarding");
          return;
        }

        if (nextProfile.status === "employee") {
          router.replace("/employee");
          return;
        }

        setProfile(nextProfile);
        const dashState = await getCompanyDashboardState(addr);
        setDashboardState(dashState);
        setPolicyDraft(dashState.companyPolicy ?? DEFAULT_COMPANY_POLICY);
        setError(null);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to load dashboard. Please refresh."
        );
      }
    });
  }, [auth.status, router]);

  const company = dashboardState?.company ?? profile?.company ?? null;
  const companyName = company?.name ?? "Allocard";
  const smartAccountLabel = company?.smartAccountAddress
    ? formatWalletAddress(company.smartAccountAddress)
    : "Smart account pending";

  const [ethBalance, setEthBalance] = useState<string | undefined>(undefined);
  const [isToppingUp, setIsToppingUp] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!company?.smartAccountAddress) return;
    try {
      const { publicClient } = await import("@/lib/client");
      const { formatUnits } = await import("viem");
      const balance = await publicClient.readContract({
        address: AUSD_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [company.smartAccountAddress as `0x${string}`],
      });

      const raw = formatUnits(balance, AUSD_DECIMALS);
      const trimmed = raw.includes(".")
        ? raw.replace(/(\.[0-9]{1,2}?)0*$/, "$1").replace(/\.$/, "")
        : raw;
      setEthBalance(trimmed || "0");
    } catch (err) {
      console.error("Failed to fetch AUSD balance", err);
    }
  }, [company?.smartAccountAddress]);

  useEffect(() => {
    let isMounted = true;
    fetchBalance();
    const interval = setInterval(() => {
      if (isMounted) fetchBalance();
    }, 15_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchBalance]);

  const handleTopUpTreasury = useCallback(async () => {
    if (!company?.smartAccountAddress) return;
    setIsToppingUp(true);
    try {
      const res = await fetch("/api/faucet/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: company.smartAccountAddress }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to top up corporate treasury");
      }
      toast.success("10,000 AUSD Minted to Treasury", {
        description: `Corporate Treasury Safe funded via Agora Testnet Faucet. Confirmed Balance: ${data.balanceAUSD} AUSD`,
        action: data.txHash ? {
          label: "View Explorer",
          onClick: () => window.open(getTxExplorerUrl(data.txHash), "_blank"),
        } : undefined,
      });
      await fetchBalance();
    } catch (err: any) {
      toast.error("Top Up Failed", {
        description: err.message || "Failed to request funds from Agora faucet",
      });
    } finally {
      setIsToppingUp(false);
    }
  }, [company?.smartAccountAddress, fetchBalance]);

  // Available balance = master balance minus the sum of all *other* active delegations' limits.
  const availableBalanceEth = useMemo(() => {
    if (ethBalance === undefined || !dashboardState) return null;
    try {
      const masterWei = parseEther(ethBalance);
      const alreadyDelegatedWei = dashboardState.delegations
        .filter((d) => d.status === "active" && d.id !== selectedDelegationId)
        .reduce((sum, d) => {
          const caveat = d.caveats.find((c) => c.caveatType === "nativeTokenTransferAmount");
          if (!caveat) return sum;
          const val = caveat.caveatValue as Record<string, unknown>;
          const weiStr = String(val.maxAmount ?? val.amount ?? "");
          if (!weiStr) return sum;
          try { return sum + BigInt(weiStr); } catch { return sum; }
        }, 0n);
      
      const availableWei = masterWei - alreadyDelegatedWei;
      if (availableWei <= 0n) return 0;
      return parseFloat(formatEther(availableWei));
    } catch {
      return null;
    }
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
        label: generateEmployeeReferenceId(employee.walletAddress),
        smartAccountAddress: employee.smartAccountAddress,
      })) ?? [],
    [dashboardState?.employees],
  );

  // Extract the configured spending allowance and remaining balance for each delegation.
  const canvasDelegations = useMemo(() => {
    if (!dashboardState) return [];
    return dashboardState.delegations.filter(d => !dashboardState.agents.some(a => a.id === d.delegateeId && isReimbursementAgent(a))).map((delegation) => {
      const allowanceCaveat = delegation.caveats.find(
        (c) => c.caveatType === "nativeTokenTransferAmount",
      );
      let allowance: string | undefined;
      if (delegation.status === "active" && allowanceCaveat) {
        const val = allowanceCaveat.caveatValue as Record<string, unknown>;
        const weiStr = String(val.maxAmount ?? val.amount ?? "");
        if (weiStr) allowance = formatAllowanceEth(weiStr);
      }
      return { ...delegation, allowance, remainingEth: delegation.remainingEth };
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
      startTransition(async () => {
        try {
          updateDashboard(await mutation());
        } catch (caughtError) {
          toast.error(
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

  const isReimbursementBudget = Boolean(selectedDelegation && dashboardState?.agents.some(
    agent => agent.id === selectedDelegation.delegateeId && isReimbursementAgent(agent),
  ));

  const handleOpenReimbursementBudget = () => {
    if (!currentAuthAddress || !dashboardState) return;
    const current = dashboardState.delegations.find(d => d.id === dashboardState.reimbursement.delegationId);
    if (current && current.status !== "revoked") {
      handleConfigureDelegation(current.id);
      return;
    }
    startTransition(async () => {
      try {
        const { delegation, reimbursement } = await prepareReimbursementBudget(currentAuthAddress);
        setDashboardState(prev => {
          if (!prev) return prev;
          const other = prev.delegations.filter(d => d.id !== delegation.id);
          return {
            ...prev,
            delegations: [...other, delegation],
            reimbursement,
          };
        });
        setSelectedDelegationId(delegation.id);
        setCaveatForm(formFromDelegation(delegation));
        setFormErrors({});
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : "Could not prepare reimbursement setup");
      }
    });
  };

  const isAgoraBudget = Boolean(selectedDelegation && dashboardState?.agents.some(
    agent => agent.id === selectedDelegation.delegateeId && isAgoraAgent(agent),
  ));

  const handleOpenAgoraBudget = () => {
    if (!currentAuthAddress || !dashboardState) return;
    const current = dashboardState.delegations.find(d => d.id === dashboardState.agora?.delegationId);
    if (current && current.status !== "revoked") {
      handleConfigureDelegation(current.id);
      return;
    }
    startTransition(async () => {
      try {
        const { delegation, agora } = await prepareAgoraRemittanceBudget(currentAuthAddress);
        setDashboardState(prev => {
          if (!prev) return prev;
          const other = prev.delegations.filter(d => d.id !== delegation.id);
          return {
            ...prev,
            delegations: [...other, delegation],
            agora,
          };
        });
        setSelectedDelegationId(delegation.id);
        setCaveatForm(formFromDelegation(delegation));
        setFormErrors({});
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : "Could not prepare Agora remittance setup");
      }
    });
  };

  const handleDropEmployee = useCallback(
    (input: {
      employeeId: string;
      canvasPositionX: number;
      canvasPositionY: number;
    }) =>
      runDashboardMutation(async () => {
        const nextState = await createEmployeeDelegation({
          walletAddress: currentAuthAddress as string,
          ...input,
        });
        toast.info("Employee Added to Canvas", {
          description: "Click Configure to set spending rules and caveats.",
        });
        return nextState;
      }),
    [runDashboardMutation, currentAuthAddress],
  );

  const handleRevokeDelegation = useCallback(
    (delegationId: string) => {
      const targetDelegation = dashboardState?.delegations.find((d) => d.id === delegationId);
      const employee = targetDelegation?.delegateeType === "user"
        ? dashboardState?.employees.find((e) => e.id === targetDelegation.delegateeId)
        : null;
      const agent = targetDelegation?.delegateeType === "agent"
        ? dashboardState?.agents.find((a) => a.id === targetDelegation.delegateeId)
        : null;
      const targetName = employee
        ? (employee.walletAddress ? `${employee.walletAddress.slice(0, 6)}...${employee.walletAddress.slice(-4)}` : "Employee")
        : (agent?.name ?? "Delegation");
      const targetAddress = employee?.smartAccountAddress || employee?.walletAddress || agent?.signerAddress || "";

      runDashboardMutation(async () => {
        const nextState = await revokeDelegation({
          walletAddress: currentAuthAddress as string,
          delegationId,
        });

        toast.success(isReimbursementAgent(agent) ? "Reimbursement payouts stopped" : "Delegation Revoked", {
          description: isReimbursementAgent(agent) ? "New claims cannot be paid under this reimbursement budget. Set up a new budget to resume payouts." : `Spending authority for ${targetName} has been revoked on Monad Testnet.`,
          action: targetAddress ? {
            label: "View Explorer",
            onClick: () => window.open(getAddressExplorerUrl(targetAddress), "_blank"),
          } : undefined,
        });

        return nextState;
      });

      setSelectedDelegationId((current) => (current === delegationId ? null : current));
    },
    [dashboardState, currentAuthAddress, runDashboardMutation],
  );

  const handleRemoveDelegation = useCallback(
    (delegationId: string) => {
      runDashboardMutation(async () => {
        const nextState = await removePendingDelegation({
          walletAddress: currentAuthAddress as string,
          delegationId,
        });
        toast.success("Delegation Removed", {
          description: "Pending delegation configuration has been removed from canvas.",
        });
        return nextState;
      });
      setSelectedDelegationId((current) =>
        current === delegationId ? null : current,
      );
    },
    [currentAuthAddress, runDashboardMutation],
  );

  const handleMoveDelegation = useCallback(
    (input: {
      delegationId: string;
      canvasPositionX: number;
      canvasPositionY: number;
    }) =>
      runDashboardMutation(() =>
        updateDelegationPosition({ walletAddress: currentAuthAddress as string, ...input }),
      ),
    [runDashboardMutation, currentAuthAddress],
  );

  const handleSmartAccountActivated = (smartAccountAddress: string | null) => {
    if (!smartAccountAddress) return;

    toast.success("Safe Smart Account Deployed", {
      description: `Company Treasury Safe is live on Monad Testnet (${smartAccountAddress.slice(0, 6)}...${smartAccountAddress.slice(-4)})`,
      action: {
        label: "View Explorer",
        onClick: () => window.open(getAddressExplorerUrl(smartAccountAddress), "_blank"),
      },
    });

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
    setTimeout(() => {
      void fetchBalance();
    }, 1500);
  };

  const resolveDelegateAddress = (delegation: DelegationRow) => {
    if (delegation.delegateeType === "user" && delegation.delegateeId) {
      const employee = dashboardState?.employees.find(
        (item) => item.id === delegation.delegateeId,
      );

      if (!employee?.smartAccountAddress) {
        throw new Error("The employee smart account must be activated first");
      }

      return employee.smartAccountAddress as `0x${string}`;
    }

    if (delegation.delegateeType === "agent" && delegation.delegateeId) {
      const agent = dashboardState?.agents.find(
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

    startTransition(async () => {
      try {
        const savedState = await saveDelegationCaveats({
          walletAddress: currentAuthAddress as string,
          delegationId: selectedDelegation.id,
          caveats: buildServerCaveats(caveatForm),
          policyPrompt: caveatForm.policyPrompt,
        });
        updateDashboard(savedState);

        if (!company?.smartAccountAddress) {
          throw new Error("Activate the company smart account first");
        }

        if (!walletClient) {
          throw new Error("Wallet signer is still loading. Please try again.");
        }

        const smartAccount = await createHybridSmartAccount(walletClient, currentAuthAddress);
        const environment = getSmartAccountsEnvironment(CHAIN_ID);
        const sdkCaveats = buildSdkCaveats(caveatForm);
        const delegation = createDelegation({
          environment,
          from: company.smartAccountAddress as Hex,
          to: resolveDelegateAddress(selectedDelegation),
          scope: {
            type: ScopeType.Erc20TransferAmount,
            tokenAddress: AUSD_ADDRESS,
            maxAmount: parseUnits(caveatForm.maxAmountEth, AUSD_DECIMALS),
          },
          caveats: sdkCaveats,
        });
        const signature = await smartAccount.signDelegation({
          delegation,
          chainId: CHAIN_ID,
        });
        const signedDelegation = { ...delegation, signature };
        const delegationHash = hashDelegation(toCoreDelegation(signedDelegation));
        const delegateAddress = resolveDelegateAddress(selectedDelegation);
        const employee = selectedDelegation.delegateeType === "user"
          ? dashboardState?.employees.find((e) => e.id === selectedDelegation.delegateeId)
          : null;
        const targetName = employee?.walletAddress
          ? `${employee.walletAddress.slice(0, 6)}...${employee.walletAddress.slice(-4)}`
          : "Employee";

        updateDashboard(
          await activateDelegation({
            walletAddress: currentAuthAddress as string,
            delegationId: selectedDelegation.id,
            delegationHash,
            signedDelegation: toSignedDelegationJson(signedDelegation),
          }),
        );
        setSelectedDelegationId(null);

        const toastTitle = isReimbursementBudget
          ? "Reimbursement budget authorized"
          : isAgoraBudget
          ? "Agora Remittance Pool authorized"
          : "Delegation Activated";

        const toastDesc = isReimbursementBudget
          ? `Employees can now submit claims against the ${caveatForm.maxAmountEth} ${TOKEN_SYMBOL} reimbursement budget.`
          : isAgoraBudget
          ? `Global contractors can now settle invoices against the ${caveatForm.maxAmountEth} ${TOKEN_SYMBOL} remittance pool on Monad.`
          : `Assigned ${caveatForm.maxAmountEth} ${TOKEN_SYMBOL} spending limit to ${targetName} on Monad Testnet`;

        toast.success(toastTitle, {
          description: toastDesc,
          action: {
            label: "View Explorer",
            onClick: () => window.open(getAddressExplorerUrl(delegateAddress), "_blank"),
          },
        });
      } catch (caughtError) {
        toast.error(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not activate delegation",
        );
      }
    });
  };

  const handleAddEmployeeByEmail = useCallback(async (email: string) => {
    setIsAddingEmployee(true);
    try {
      const addr = (currentAuthAddress || (profile && "user" in profile && profile.user ? profile.user.walletAddress : undefined)) as string;
      const result = await addEmployeeByEmail({ walletAddress: addr, email });
      if (result.status === "already_pending") {
        toast.warning("Invitation Already Sent", {
          description: "An invitation has already been sent to this email.",
        });
      } else if (result.status === "already_active") {
        toast.info("Employee Already Active", {
          description: "This employee already has access to the workspace.",
        });
      } else {
        toast.success("Employee Invited", {
          description: "They can now sign in to access their corporate expense card.",
        });
      }
      updateDashboard(await getCompanyDashboardState(addr));
    } catch (caught) {
      toast.error("Invitation Failed", {
        description: caught instanceof Error ? caught.message : "Could not add employee.",
      });
      throw caught;
    } finally {
      setIsAddingEmployee(false);
    }
  }, [currentAuthAddress, profile, updateDashboard]);

  if (auth.status === "unauthenticated" && !dashboardState) {
    return <ConnectRequiredCard />;
  }

  if (auth.status === "connecting" && !dashboardState) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center p-6 bg-white">
        <div className="flex flex-col items-center gap-6 text-center">
          <img src="/AllocardLogoBlack.svg" alt="Allocard Logo" className="w-16 h-16 object-contain mb-4" />
          <div className="w-10 h-10 border-4 border-[#eaeaea] border-t-[#111] rounded-full animate-spin"></div>
          <p className="text-xl font-bold text-[#111] tracking-[-0.02em]">Connecting wallet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-screen flex-col items-center justify-center gap-8 bg-white p-8">
        <div className="flex flex-col items-center gap-6 text-center max-w-md">
          <div className="w-16 h-16 flex items-center justify-center mb-2">
            <img src="/AllocardLogoBlack.svg" alt="Allocard Logo" className="w-full h-full object-contain opacity-50 grayscale" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-2xl font-bold text-[#111]">Dashboard failed to load</p>
            <p className="text-base text-[#666] leading-relaxed">{error}</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
            <button
              onClick={() => window.location.reload()}
              className="h-12 w-full rounded-md bg-[#111] text-white text-base font-semibold hover:bg-[#333] transition-colors cursor-pointer"
            >
              Reload page
            </button>
            <Link href="/" className="h-12 w-full rounded-md border border-[#eaeaea] bg-white text-[#111] text-base font-semibold hover:bg-[#f5f5f5] transition-colors flex items-center justify-center">
              Return to Home Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardState || !company) {
    return (
      <div className="flex h-full min-h-screen flex-col items-center justify-center gap-8 bg-white">
        <div className="flex flex-col items-center gap-6">
          <svg className="animate-spin text-[#ccc]" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" className="opacity-100 text-[#111]" />
            <path strokeLinecap="round" d="M12 2a10 10 0 0 0-10 10" className="opacity-20" />
          </svg>
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-xl font-semibold text-[#111]">
              {isPending ? "Loading company dashboard" : "Verifying access"}
            </p>
            <p className="text-sm text-[#999]">
              {isPending ? "Fetching your delegations and employees..." : "Checking your account status..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      companyName={companyName}
      employees={dashboardState.employees.map((employee) => ({
        id: employee.id,
        label: generateEmployeeReferenceId(employee.walletAddress),
        detail: employee.smartAccountAddress
          ? formatWalletAddress(employee.smartAccountAddress)
          : "Smart account pending",
      }))}
      pendingEmployees={dashboardState.pendingEmployees}
      onInviteEmployeeByEmail={handleAddEmployeeByEmail}
      agents={[]}
      onAddEmployee={(employeeId) =>
        runDashboardMutation(() =>
          createEmployeeDelegation({
            walletAddress: currentAuthAddress as string,
            employeeId,
            canvasPositionX: 420,
            canvasPositionY: 120 + dashboardState.delegations.length * 90,
          }),
        )
      }
      onRefreshEmployees={() => {
        startRefreshTransition(async () => {
          updateDashboard(await getCompanyDashboardState(currentAuthAddress as string));
        });
      }}
      companyId={(profile && "user" in profile && profile.user && profile.user.companyId) || undefined}
      workspaceOptions={(profile && "workspaces" in profile && profile.workspaces) || []}
      onWorkspaceChange={(companyId, role) => {
        startTransition(async () => {
          try {
            await setWorkspaceContext({ walletAddress: currentAuthAddress as string, companyId, role });
            setDashboardState(null);
            setProfile(null);
            window.location.assign(role === "employer" ? "/employer" : "/employee");
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Could not switch workspace");
          }
        });
      }}
      employeesRefreshing={isRefreshing}
      roleLabel="Company owner"
      smartAccountLabel={smartAccountLabel}
      smartAccountAddress={company?.smartAccountAddress}
      title="Company dashboard"
    >
      <div className="flex min-h-full flex-col gap-4">
        {/* Smart account activation banner */}
        {!company.smartAccountAddress && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Company smart account not yet activated
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Activate the company smart account to start delegating spending authority to employees and agents.
              </p>
            </div>
            <SmartAccountActivationButton
              walletAddress={currentAuthAddress as `0x${string}`}
              existingSmartAccountAddress={company.smartAccountAddress}
              onActivated={(result) => handleSmartAccountActivated(result.smartAccountAddress)}
            />
          </div>
        )}

        <SectionCards
          employeeCount={dashboardState.summary.employeeCount}
          smartAccountBalance={ethBalance ?? "—"}
          activeDelegationCount={dashboardState.summary.activeDelegationCount}
          delegatedNativeEthAllowance={
            dashboardState.summary.delegatedNativeEthAllowance
          }
          onTopUp={handleTopUpTreasury}
          isToppingUp={isToppingUp}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReimbursementsCard
            role="employer"
            program={dashboardState.reimbursement}
            accountReady={Boolean(company.smartAccountAddress)}
            busy={isPending || isRefreshing}
            onOpen={handleOpenReimbursementBudget}
            onRefresh={() => startRefreshTransition(async () => {
              try { updateDashboard(await getCompanyDashboardState(currentAuthAddress as string)); }
              catch (caught) { toast.error(caught instanceof Error ? caught.message : "Could not refresh reimbursements"); }
            })}
          />
          <AgoraCrossBorderCard
            role="employer"
            program={dashboardState.agora}
            accountReady={Boolean(company.smartAccountAddress)}
            busy={isPending || isRefreshing}
            onOpen={handleOpenAgoraBudget}
            onRefresh={() => startRefreshTransition(async () => {
              try { updateDashboard(await getCompanyDashboardState(currentAuthAddress as string)); }
              catch (caught) { toast.error(caught instanceof Error ? caught.message : "Could not refresh remittances"); }
            })}
          />
        </div>

        <Tabs defaultValue="canvas" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="canvas">Delegation Canvas</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
            <TabsTrigger value="settings">Company Policy</TabsTrigger>
          </TabsList>

          <TabsContent value="canvas" className="mt-0">
            <DashboardFlowCanvas
              company={canvasCompany ?? company}
              headerAction={
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    startRefreshTransition(async () => {
                      updateDashboard(await getCompanyDashboardState(currentAuthAddress as string));
                    });
                  }} 
                  disabled={isRefreshing}
                >
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
              }
              employees={canvasEmployees}
              agents={dashboardState.agents.filter(agent => !isReimbursementAgent(agent) && !isAgoraAgent(agent)).map((agent) => ({
                id: agent.id,
                name: agent.name,
                smartAccountAddress: agent.smartAccountAddress,
              }))}
              delegations={canvasDelegations}
              onConfigureDelegation={handleConfigureDelegation}
              onDropEmployee={handleDropEmployee}
              onDropAgent={({ agentId, canvasPositionX, canvasPositionY }) =>
                runDashboardMutation(async () => {
                  const nextState = await createAgentDelegation({
                    walletAddress: currentAuthAddress as string,
                    agentId,
                    canvasPositionX,
                    canvasPositionY,
                  });
                  toast.info("AI Agent Added to Canvas", {
                    description: "Click Configure to set spending rules and caveats for this agent.",
                  });
                  return nextState;
                })
              }
              onMoveDelegation={handleMoveDelegation}
              onRevokeDelegation={handleRevokeDelegation}
              onRemoveDelegation={handleRemoveDelegation}
            />
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Employer Activity Log</h3>
              <p className="text-sm text-muted-foreground mb-6">
                A unified view of all direct employee spends, agent bookings, and reimbursements within your company.
              </p>
              <ActivityLogTable companyId={company.id} />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <CompanyPolicyEditor
              companyPolicy={dashboardState?.companyPolicy ?? null}
              onSave={async (newPolicy) => {
                await runDashboardMutation(async () => {
                  const nextState = await updateCompanyPolicy({
                    walletAddress: currentAuthAddress as string,
                    companyPolicy: newPolicy,
                  });
                  toast.success("Company Policy Updated", {
                    description: "AI guidelines and spending policy updated successfully.",
                  });
                  return nextState;
                });
              }}
            />
          </TabsContent>
        </Tabs>
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
            <DrawerTitle>{isReimbursementBudget ? "Reimbursement budget & policy" : "Spending Limits & Rules"}</DrawerTitle>
            <DrawerDescription>
              {isReimbursementBudget
                ? "Authorize company funds for approved employee claims. To change an active budget, stop payouts and set up a new budget."
                : selectedDelegation?.status === "active"
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
              <h4 className="text-sm font-semibold text-foreground">{isReimbursementBudget ? "1. Reimbursement budget" : "1. Overall Spending Limits"}</h4>
              
              <div className="flex flex-col gap-2">
                <Label htmlFor="max-amount">{isReimbursementBudget ? "Total reimbursement budget" : "Lifetime Spending Limit"} ({TOKEN_SYMBOL})</Label>
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
                  <div className="text-[0.8rem] text-muted-foreground space-y-1">
                    <p>{isReimbursementBudget ? "The total amount available for employee claims under this authorization." : <>The absolute maximum amount of {TOKEN_SYMBOL} this delegatee can spend in total over the lifetime of this delegation.</>}</p>
                    {availableBalanceEth !== null && selectedDelegation?.status !== "active" && (
                      <p>
                        Remaining available to delegate: <span className="font-semibold text-foreground">{Number(availableBalanceEth.toFixed(4))} {TOKEN_SYMBOL}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {!isReimbursementBudget && (
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
              )}

              {!isReimbursementBudget && caveatForm.period !== "none" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="period-amount">Allowance per Period ({TOKEN_SYMBOL})</Label>
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
                <Label htmlFor="value-lte">Maximum Per-Transaction ({TOKEN_SYMBOL})</Label>
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

              {!isReimbursementBudget && (
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
              )}
            </div>

            {!isReimbursementBudget && <Separator />}

            {/* Section 3: Target & Address Restrictions */}
            {!isReimbursementBudget && (
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
            )}

            <Separator />

            {/* Section 4: AI Policy Prompt */}
            {selectedDelegation?.delegateeType === "agent" && (
              <div className="flex flex-col gap-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BotIcon className="h-4 w-4 text-chart-5" />
                  {isReimbursementBudget ? "3. Reimbursement Policy Rules" : "4. AI Policy Prompt"}
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
                  <p className="text-[0.8rem] text-muted-foreground">These additional rules are used with your company policy to assess expenses. The authorized payment limits still apply.</p>
                </div>
              </div>
            )}
            
            <div className="pb-4"></div>
          </div>
          {Boolean(selectedDelegation) && (
            <DrawerFooter className="border-t pt-4">
              {selectedDelegation?.status === "active" ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isPending}>
                      <BanIcon className="size-4 mr-2" />
                      {isReimbursementBudget ? "Stop reimbursement payouts" : "Revoke delegation"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {isReimbursementBudget
                          ? "This stops new reimbursement payouts under the current budget. Previous payments stay in your activity log. Authorize a new budget to resume payouts."
                          : "This will permanently revoke this active delegation on Monad Testnet. All child AI agents under this delegation will also lose spending authority immediately."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          const id = selectedDelegation.id;
                          setSelectedDelegationId(null);
                          handleRevokeDelegation(id);
                        }}
                        className="bg-red-600 text-white hover:bg-red-700"
                      >
                        {isReimbursementBudget ? "Stop payouts" : "Yes, revoke delegation"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : selectedDelegation?.status === "pending_config" ? (
                <Button onClick={handleActivateDelegation} disabled={isPending}>
                  {isPending ? (
                    <LoaderCircleIcon className="size-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldCheckIcon className="size-4 mr-2" />
                  )}
                  {isReimbursementBudget ? "Authorize reimbursement budget" : "Activate delegation"}
                </Button>
              ) : null}
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    </DashboardShell>
  );
}



function CompanyPolicyEditor({
  companyPolicy,
  onSave,
}: {
  companyPolicy: string | null;
  onSave: (policy: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(companyPolicy ?? DEFAULT_COMPANY_POLICY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges = draft !== (companyPolicy ?? DEFAULT_COMPANY_POLICY);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(DEFAULT_COMPANY_POLICY);
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-800">Company Expense Policy</h3>
        <p className="mt-1 text-sm text-neutral-500">
          This policy is the single source of truth for all Qwen AI checks:
          reimbursements, direct spends, and agent decisions. Edit once, applied everywhere.
        </p>
      </div>

      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="min-h-[280px] font-mono text-sm resize-y"
        placeholder="Enter your company expense policy..."
      />

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            size="sm"
          >
            {saving ? "Saving..." : saved ? "✓ Saved" : "Save Policy"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            Reset to Default
          </Button>
        </div>
        {saved && (
          <span className="text-xs text-green-600 font-medium">
            Policy saved: all Qwen AI checks now use this policy.
          </span>
        )}
        {!hasChanges && !saved && (
          <span className="text-xs text-neutral-400">
            No changes to save.
          </span>
        )}
      </div>
    </div>
  );
}

