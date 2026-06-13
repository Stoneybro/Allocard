"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { formatEther, parseEther, type Hex } from "viem";
import {
  createAgentRedelegation,
  activateEmployeeDelegation,
  revokeEmployeeDelegation,
  saveEmployeeRedelegationCaveats,
  getEmployeeDashboardState,
  getAgentSmartAccountAddress,
  type EmployeeDashboardState,
} from "@/app/actions/identity";
import {
  ConnectRequiredCard,
} from "@/components/auth-state";
import { useAuth } from "@/components/AuthProvider";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmployeeSectionCards } from "@/components/employee-section-cards";
import { EmployeeFlowCanvas } from "@/components/employee-flow-canvas";
import { ReimbursementAgentDrawer } from "./ReimbursementAgentDrawer";
import { TravelAgentDrawer } from "./TravelAgentDrawer";
import { ProcurementAgentDrawer } from "./ProcurementAgentDrawer";
import { SmartAccountActivationButton } from "@/components/smart-account-activation-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
import { Textarea } from "@/components/ui/textarea";
import { DirectSpendForm } from "./DirectSpendForm";
import { createHybridSmartAccount } from "@/lib/smartAccount";
import { cn } from "@/lib/utils";
import { formatWalletAddress } from "@/lib/wallet";
import { useWalletClient, useSwitchChain } from "wagmi";
import { baseSepolia } from "viem/chains";

// ── Types ───────────────────────────────────────────────────────────────────

type DelegationRow = EmployeeDashboardState["outboundDelegations"][number];

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

type FormErrors = {
  maxAmountEth?: string;
  periodAmountEth?: string;
  perTransactionCapEth?: string;
  limitedCalls?: string;
  allowedTargets?: string;
  allowedTargetsWarning?: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const periodDurations = {
  hourly: 60 * 60,
  daily: 60 * 60 * 24,
  weekly: 60 * 60 * 24 * 7,
  monthly: 60 * 60 * 24 * 30,
} as const;

const ETH_AMOUNT_RE = /^\d+(\.\d+)?$/;
const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function buildEmptyCaveatForm(parentMaxEth: string): CaveatForm {
  return {
    maxAmountEth: parentMaxEth,
    period: "none",
    periodAmountEth: "",
    perTransactionCapEth: "",
    allowedTargets: "",
    limitedCallsEnabled: false,
    limitedCalls: "1",
    policyPrompt: "",
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function splitAddresses(value: string) {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}

function caveatRecord(caveat: DelegationRow["caveats"][number]) {
  return caveat.caveatValue && typeof caveat.caveatValue === "object"
    ? (caveat.caveatValue as Record<string, unknown>)
    : {};
}

function formFromDelegation(
  delegation: DelegationRow | null,
  parentMaxEth: string,
): CaveatForm {
  if (!delegation) return buildEmptyCaveatForm(parentMaxEth);

  const nextForm: CaveatForm = buildEmptyCaveatForm(parentMaxEth);

  for (const caveat of delegation.caveats) {
    const value = caveatRecord(caveat);

    if (caveat.caveatType === "nativeTokenTransferAmount") {
      const wei = value.maxAmount ?? value.amount;
      nextForm.maxAmountEth = typeof wei === "string" ? weiToEthInput(wei) : parentMaxEth;
    }

    if (caveat.caveatType === "nativeTokenPeriodTransfer") {
      const period = value.period;
      const amount = value.periodAmount ?? value.amount;
      nextForm.period =
        period === "hourly" || period === "daily" || period === "weekly" || period === "monthly"
          ? period
          : "daily";
      nextForm.periodAmountEth = typeof amount === "string" ? weiToEthInput(amount) : "";
    }

    if (caveat.caveatType === "valueLte") {
      const maxValue = value.maxValue ?? value.valueWei;
      nextForm.perTransactionCapEth = typeof maxValue === "string" ? weiToEthInput(maxValue) : "";
    }

    if (caveat.caveatType === "allowedTargets" && Array.isArray(value.targets)) {
      nextForm.allowedTargets = (value.targets as string[]).join("\n");
    }

    if (caveat.caveatType === "limitedCalls") {
      nextForm.limitedCallsEnabled = true;
      nextForm.limitedCalls = typeof value.limit === "number" ? String(value.limit) : "1";
    }
  }

  return nextForm;
}

function weiToEthInput(wei: string) {
  const value = BigInt(wei);
  const whole = value / 1_000_000_000_000_000_000n;
  const fractional = value % 1_000_000_000_000_000_000n;
  if (fractional === 0n) return whole.toString();
  return `${whole}.${fractional.toString().padStart(18, "0").replace(/0+$/, "")}`;
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
    caveats.push({ type: "valueLte", maxValue: parseEther(form.perTransactionCapEth) });
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

function validateCaveatForm(form: CaveatForm, parentMaxEth: string): FormErrors {
  const errors: FormErrors = {};
  const parentMax = parseFloat(parentMaxEth);

  if (!ETH_AMOUNT_RE.test(form.maxAmountEth.trim())) {
    errors.maxAmountEth = "Enter a valid ETH amount (e.g. 0.005).";
  } else {
    const max = parseFloat(form.maxAmountEth);
    if (max <= 0) {
      errors.maxAmountEth = "Spending limit must be greater than 0.";
    } else if (!isNaN(parentMax) && max > parentMax) {
      errors.maxAmountEth = `Cannot exceed the parent delegation limit of ${parentMaxEth} ETH.`;
    }
  }

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
        errors.periodAmountEth = `Period allowance cannot exceed the lifetime limit (${form.maxAmountEth} ETH).`;
      }
    }
  }

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
          errors.perTransactionCapEth = `Per-transaction cap cannot exceed ${form.period !== "none" ? `the period allowance (${form.periodAmountEth} ETH)` : `the lifetime limit (${form.maxAmountEth} ETH)`}.`;
        }
      }
    }
  }

  if (form.limitedCallsEnabled) {
    const n = Number(form.limitedCalls);
    if (!Number.isInteger(n) || n < 1) {
      errors.limitedCalls = "Transaction limit must be a whole number ≥ 1.";
    }
  }

  const addresses = splitAddresses(form.allowedTargets);
  const invalidAddresses = addresses.filter((a) => !ETH_ADDRESS_RE.test(a));
  if (invalidAddresses.length > 0) {
    errors.allowedTargets = `Invalid auth.address${invalidAddresses.length > 1 ? "es" : ""}: ${invalidAddresses.join(", ")}`;
  } else if (addresses.length === 0) {
    errors.allowedTargetsWarning = "No addresses specified — the agent can send to any address.";
  }

  return errors;
}

function toCoreDelegation(delegation: Delegation) {
  return { ...delegation, salt: BigInt(delegation.salt) };
}

function toSignedDelegationJson(delegation: Delegation) {
  return {
    ...delegation,
    caveats: delegation.caveats.map((caveat: Caveat) => ({ ...caveat })),
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export function EmployeeClient() {
  const router = useRouter();
  const auth = useAuth();
  const didLoadDashboard = useRef(false);
  const [dashboardState, setDashboardState] = useState<EmployeeDashboardState | null>(null);
  const [isPending, startTransition] = useTransition();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const [error, setError] = useState<string | null>(null);
  const [selectedDelegationId, setSelectedDelegationId] = useState<string | null>(null);
  const [caveatForm, setCaveatForm] = useState<CaveatForm>(buildEmptyCaveatForm("0.01"));
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (auth.status !== "authenticated" || didLoadDashboard.current) return;
    didLoadDashboard.current = true;
    const addr = auth.address;

    startTransition(async () => {
      try {
        const { getWalletProfile } = await import("@/app/actions/identity");
        const profile = await getWalletProfile(addr);

        if (profile.status === "new") {
          router.replace("/onboarding");
          return;
        }

        if (profile.status === "employer") {
          router.replace("/employer");
          return;
        }

        const state = await getEmployeeDashboardState(addr);
        setDashboardState(state);
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


  // ── Derived values ─────────────────────────────────────────────────────────

  const approvedWei = useMemo(() => {
    try {
      const inbound = dashboardState?.inboundDelegation;
      if (!inbound) return 0n;
      const caveat = inbound.caveats.find((c) => c.caveatType === "nativeTokenTransferAmount");
      if (!caveat) return 0n;
      const val = caveat.caveatValue as Record<string, unknown>;
      return BigInt(String(val.maxAmount ?? val.amount ?? "0"));
    } catch { return 0n; }
  }, [dashboardState?.inboundDelegation]);

  const redelegatedWei = useMemo(() => {
    try {
      const activeOutbound = dashboardState?.outboundDelegations.filter((d) => d.status === "active") ?? [];
      return activeOutbound.reduce((sum, d) => {
        const caveat = d.caveats.find((c) => c.caveatType === "nativeTokenTransferAmount");
        if (!caveat) return sum;
        const val = caveat.caveatValue as Record<string, unknown>;
        return sum + BigInt(String(val.maxAmount ?? val.amount ?? "0"));
      }, 0n);
    } catch { return 0n; }
  }, [dashboardState?.outboundDelegations]);

  const remainingWei = approvedWei > redelegatedWei ? approvedWei - redelegatedWei : 0n;

  const parentMaxEth = useMemo(() => {
    try {
      const inbound = dashboardState?.inboundDelegation;
      if (!inbound) return "0.01";
      const caveat = inbound.caveats.find((c) => c.caveatType === "nativeTokenTransferAmount");
      if (!caveat) return "0.01";
      const val = caveat.caveatValue as Record<string, unknown>;
      const wei = BigInt(String(val.maxAmount ?? val.amount ?? "0"));
      return weiToEthInput(wei.toString());
    } catch { return "0.01"; }
  }, [dashboardState?.inboundDelegation]);

  const selectedDelegation = useMemo(
    () => dashboardState?.outboundDelegations.find((d) => d.id === selectedDelegationId) ?? null,
    [dashboardState?.outboundDelegations, selectedDelegationId],
  );

  // ── Sidebar agent list ─────────────────────────────────────────────────────
  // Agents come from identity.ts getEmployeeDashboardState — not yet returned in
  // EmployeeDashboardState, but the sidebar will use company agents once Phase 6
  // adds the catalog. For now we pass an empty array (placeholder agents show).
  // Platform agents come from dashboardState.agents (populated by getEmployeeDashboardState).
  const sidebarAgents = useMemo(
    () =>
      (dashboardState?.agents ?? []).map((agent) => ({
        id: agent.id,
        name: agent.name,
        detail: agent.description ?? "Platform AI agent",
      })),
    [dashboardState?.agents],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  function formatEthTrimmed(wei: bigint) {
    const s = formatEther(wei);
    if (!s.includes(".")) return s;
    return s.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
  }

  const refreshDashboard = useCallback(async () => {
    if (auth.status !== "authenticated" || !auth.address) return;
    const state = await getEmployeeDashboardState(auth.address);
    setDashboardState(state);
  }, [auth]);

  // Manual refresh only — mutations already refresh state automatically

  const runEmployeeMutation = useCallback(
    (mutation: () => Promise<EmployeeDashboardState>) => {
      setError(null);
      startTransition(async () => {
        try {
          setDashboardState(await mutation());
        } catch (caughtError) {
          setError(caughtError instanceof Error ? caughtError.message : "Action failed");
        }
      });
    },
    [],
  );

  const handleSmartAccountActivated = (smartAccountAddress: string | null) => {
    if (!smartAccountAddress) return;
    setDashboardState((current) => {
      if (!current) return current;
      return { ...current, employee: { ...current.employee, smartAccountAddress } };
    });
  };

  const [isReimbursementDrawerOpen, setIsReimbursementDrawerOpen] = useState(false);
  const [isTravelAgentDrawerOpen, setIsTravelAgentDrawerOpen] = useState(false);
  const [activeTravelDelegationId, setActiveTravelDelegationId] = useState<string | null>(null);
  const [isProcurementAgentDrawerOpen, setIsProcurementAgentDrawerOpen] = useState(false);
  const [activeProcurementDelegationId, setActiveProcurementDelegationId] = useState<string | null>(null);

  // Task 4: agent picker — creates a new redelegation row then opens the drawer
  const handleSelectAgent = useCallback(
    (agentId: string, canvasPositionX?: number, canvasPositionY?: number) => {
      if (auth.status !== "authenticated" || !auth.address || !dashboardState) return;
      const walletAddress = auth.address;
      setError(null);

      const selectedAgent = dashboardState.agents.find(a => a.id === agentId);
      if (selectedAgent?.name === "Reimbursement Agent") {
        setIsReimbursementDrawerOpen(true);
        return;
      }
      
      startTransition(async () => {
        try {
          const state = await createAgentRedelegation({ walletAddress, agentId, canvasPositionX, canvasPositionY });
          setDashboardState(state);

          const pending = state.outboundDelegations.find(
            (d) => d.delegateeId === agentId && d.status !== "revoked",
          );
          if (pending) {
            setSelectedDelegationId(pending.id);
            setCaveatForm(formFromDelegation(pending, parentMaxEth));
            setFormErrors({});
          }
        } catch (caughtError) {
          setError(caughtError instanceof Error ? caughtError.message : "Could not create redelegation");
        }
      });
    },
    [auth, parentMaxEth, dashboardState],
  );

  // Wrapper for drag-and-drop: canvas calls onDropAgent({ agentId, canvasPositionX, canvasPositionY })
  const handleDropAgent = useCallback(
    (input: { agentId: string; canvasPositionX: number; canvasPositionY: number }) => {
      handleSelectAgent(input.agentId, input.canvasPositionX, input.canvasPositionY);
    },
    [handleSelectAgent],
  );

  const handleNodeClick = useCallback((event: any, node: any) => {
    if (node.data?.kind === "agent" && node.data?.status === "active") {
      const agentId = node.data.subtitle; // subtitle holds the delegateeId which is agent.id
      const agent = dashboardState?.agents.find(a => a.id === agentId);
      if (agent?.name === "Travel Agent") {
        setActiveTravelDelegationId(node.data.delegationId);
        setIsTravelAgentDrawerOpen(true);
      } else if (agent?.name === "Procurement Agent") {
        setActiveProcurementDelegationId(node.data.delegationId);
        setIsProcurementAgentDrawerOpen(true);
      }
    }
  }, [dashboardState?.agents]);

  // Task 7a: open drawer for existing delegation (configure / view rules)
  const handleConfigureDelegation = useCallback(
    (delegationId: string) => {
      const delegation =
        dashboardState?.outboundDelegations.find((d) => d.id === delegationId) ?? null;

      // For active agent delegations, open the agent-specific drawer
      if (delegation?.status === "active" && delegation.delegateeId) {
        const agent = dashboardState?.agents.find(a => a.id === delegation.delegateeId);
        if (agent?.name === "Travel Agent") {
          setActiveTravelDelegationId(delegationId);
          setIsTravelAgentDrawerOpen(true);
          return;
        }
        if (agent?.name === "Procurement Agent") {
          setActiveProcurementDelegationId(delegationId);
          setIsProcurementAgentDrawerOpen(true);
          return;
        }
        if (agent?.name === "Reimbursement Agent") {
          setIsReimbursementDrawerOpen(true);
          return;
        }
      }

      // Default: open the caveat configuration drawer (for pending agents or employees)
      setSelectedDelegationId(delegationId);
      setCaveatForm(formFromDelegation(delegation, parentMaxEth));
      setFormErrors({});
    },
    [dashboardState?.outboundDelegations, dashboardState?.agents, parentMaxEth],
  );

  // Task 7b: revoke an employee's own outbound delegation
  const handleRevokeDelegation = useCallback(
    (delegationId: string) => {
      if (auth.status !== "authenticated" || !auth.address) return;
      const walletAddress = auth.address;
      runEmployeeMutation(() =>
        revokeEmployeeDelegation({ walletAddress, delegationId }),
      );
    },
    [auth, runEmployeeMutation],
  );

  // Task 6: save caveats then sign and activate the delegation
  const handleActivateDelegation = useCallback(() => {
    if (auth.status !== "authenticated" || !selectedDelegation || !auth.address) return;
    const walletAddress = auth.address;

    const errors = validateCaveatForm(caveatForm, parentMaxEth);
    setFormErrors(errors);
    const hasErrors = Object.keys(errors).some(
      (k) => k !== "allowedTargetsWarning" && errors[k as keyof FormErrors],
    );
    if (hasErrors) return;

    setError(null);
    startTransition(async () => {
      try {
        // 1. Persist caveats (also validates against parent server-side)
        const savedState = await saveEmployeeRedelegationCaveats({
          walletAddress,
          delegationId: selectedDelegation.id,
          caveats: buildServerCaveats(caveatForm),
        });
        setDashboardState(savedState);

        // 2. Resolve employee smart account auth.address for signing
        if (!savedState.employee.smartAccountAddress) {
          throw new Error("Activate your smart account before signing a delegation.");
        }

        // 3. Resolve agent's smart account auth.address as the delegate auth.address
        const agentId = selectedDelegation.delegateeId;
        if (!agentId) {
          throw new Error("Delegation target agent is missing.");
        }

        // Fetch the agent's smart account auth.address from the database
        let agentSmartAccountAddress: `0x${string}`;
        agentSmartAccountAddress = await getAgentSmartAccountAddress(agentId);

        // 4. Build and sign the delegation from the employee's smart account
        if (!walletClient) {
          throw new Error("Wallet signer is still loading. Please try again.");
        }

        // Ensure the wallet is on Base Sepolia before signing
        try {
          await switchChainAsync({ chainId: baseSepolia.id });
        } catch (switchError) {
          console.warn("Could not switch chain via wagmi", switchError);
        }

        const smartAccount = await createHybridSmartAccount(walletClient, walletAddress);
        const environment = getSmartAccountsEnvironment(84532);
        const sdkCaveats = buildSdkCaveats(caveatForm);

        // The parent signedDelegation is already stored in inboundDelegation
        const parentSignedDelegation = savedState.inboundDelegation?.signedDelegation;
        if (!parentSignedDelegation) {
          throw new Error("Parent signed delegation not found.");
        }

        const delegation = createDelegation({
          environment,
          from: savedState.employee.smartAccountAddress as Hex,
          to: agentSmartAccountAddress,
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

        // 5. Persist the signed delegation
        const activatedState = await activateEmployeeDelegation({
          walletAddress,
          delegationId: selectedDelegation.id,
          delegationHash,
          signedDelegation: toSignedDelegationJson(signedDelegation),
        });
        setDashboardState(activatedState);
        setSelectedDelegationId(null);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Could not activate delegation");
      }
    });
  }, [selectedDelegation, auth, caveatForm, parentMaxEth]);

  // Task 8: Direct Spend execution
  const handleExecuteSpend = async (details: { toAddress: string; amountEth: string; purpose: string; isFlagged: boolean }) => {
    if (auth.status !== "authenticated" || !auth.address || !dashboardState?.employee?.smartAccountAddress) {
      throw new Error("Smart account not activated.");
    }
    const walletAddress = auth.address;

    if (!walletClient) {
      throw new Error("Wallet signer is still loading. Please try again.");
    }

    // Ensure the wallet is on Base Sepolia before sending
    try {
      await switchChainAsync({ chainId: baseSepolia.id });
    } catch (switchError) {
      console.warn("Could not switch chain via wagmi", switchError);
    }

    const smartAccount = await createHybridSmartAccount(walletClient, walletAddress);
    
    const { createBundlerClient } = await import("viem/account-abstraction");
    const { createPublicClient, http, parseEther } = await import("viem");

    const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL;
    if (!bundlerUrl) throw new Error("Missing NEXT_PUBLIC_BUNDLER_RPC_URL");

    const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
    const bundlerClient = createBundlerClient({
      client: publicClient,
      chain: baseSepolia,
      transport: http(bundlerUrl),
    });

    // Send Transaction via Bundler / viem
    const userOpHash = await bundlerClient.sendUserOperation({
      account: smartAccount as any,
      calls: [{
        to: details.toAddress as Hex,
        value: parseEther(details.amountEth),
        data: "0x",
      }]
    });

    const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
    const txHash = receipt.receipt.transactionHash;

    // Call the backend to log it
    const res = await fetch("/api/wallet/spend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: dashboardState.company.id,
        employeeId: dashboardState.employee.id,
        delegationId: dashboardState.inboundDelegation?.id || "",
        ...details,
        txHash,
      }),
    });
    
    if (!res.ok) {
      const errData = await res.json();
      console.error("Backend logging failed:", errData);
      // Even if backend fails, the tx was sent, so we still return txHash
    }

    return txHash;
  };

  const handleVerifyReceipt = async (txHash: string, imageBase64: string) => {
    const res = await fetch("/api/wallet/verify-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash, imageBase64, mimeType: "image/jpeg" }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to verify receipt");
    }
  };

  // ── Render guards ──────────────────────────────────────────────────────────

  if (auth.status === "unauthenticated") {
    return <ConnectRequiredCard />;
  }

  if (auth.status === "initializing") {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading employee workspace...</p>
      </div>
    );
  }

  if (auth.status === "error") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <p className="text-sm font-semibold text-destructive">Wallet initialization failed</p>
          <p className="mt-1 text-xs text-muted-foreground">{auth.message}</p>
          <button onClick={auth.retry} className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90">Retry</button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="rounded-full bg-destructive/10 p-3">
            <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-destructive">Dashboard failed to load</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            Reload page
          </button>
        </div>
      </div>
    );
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

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <DashboardShell
      companyName={company.name}
      smartAccountLabel={smartAccountLabel}
      smartAccountAddress={employee.smartAccountAddress}
      title="Employee dashboard"
      roleLabel="Employee"
      role="employee"
      agents={sidebarAgents}
      onSelectAgent={handleSelectAgent}
      onRefreshEmployees={refreshDashboard}
      employeesRefreshing={isPending}
    >
      <div className="flex flex-col gap-6">
        {/* Smart account activation banner */}
        {!employee.smartAccountAddress && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Smart account not yet activated
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Activate your smart account so the company can delegate spending authority to you.
              </p>
            </div>
            <SmartAccountActivationButton
              walletAddress={auth.address}
              existingSmartAccountAddress={employee.smartAccountAddress}
              onActivated={(result) => handleSmartAccountActivated(result.smartAccountAddress)}
            />
          </div>
        )}

        {/* Global error banner */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        )}

        {/* Summary cards */}
        <EmployeeSectionCards
          approvedLimitEth={summary.approvedLimitEth}
          redelegatedEth={summary.redelegatedEth}
          activeAgentCount={summary.activeAgentCount}
          remainingEth={formatEthTrimmed(remainingWei)}
        />

        {/* Tabs for Canvas and Direct Spend */}
        <Tabs defaultValue="canvas" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="canvas">Delegation Canvas</TabsTrigger>
            <TabsTrigger value="wallet">Wallet & Direct Spend</TabsTrigger>
          </TabsList>
          
          <TabsContent value="canvas" className="mt-0">
            {/* Canvas */}
            <EmployeeFlowCanvas
              dashboardState={dashboardState}
              onConfigureDelegation={handleConfigureDelegation}
              onRevokeDelegation={handleRevokeDelegation}
              onNodeClick={handleNodeClick}
              onDropAgent={handleDropAgent}
              headerAction={
                <Button type="button" variant="outline" size="sm" onClick={() => void refreshDashboard()} disabled={isPending}>
                  {isPending ? "Refreshing..." : "Refresh"}
                </Button>
              }
            />
          </TabsContent>
          
          <TabsContent value="wallet" className="mt-0">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">Manual Spend</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Spend directly from your delegated wallet. Your intended purpose will be checked against the company policy by Venice AI.
              </p>
              <DirectSpendForm 
                delegationId={dashboardState.inboundDelegation?.id || ""} 
                onExecute={handleExecuteSpend}
                onVerifyReceipt={handleVerifyReceipt}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Caveat Configuration Drawer (Tasks 5 & 6) ──────────────────────── */}
      <Drawer
        direction="right"
        open={Boolean(selectedDelegation)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDelegationId(null);
            setFormErrors({});
            setError(null);
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Agent Spending Rules</DrawerTitle>
            <DrawerDescription>
              {selectedDelegation?.status === "active"
                ? "These rules are active and enforced on-chain. Values are constrained by your inbound delegation."
                : "Configure what this agent is allowed to spend. Values cannot exceed your approved limit."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-2">
            {selectedDelegation && (
              <div>
                <Badge
                  variant={selectedDelegation.status === "active" ? "secondary" : "outline"}
                  className="mb-2"
                >
                  {formatDelegationStatus(selectedDelegation.status)}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Parent limit: <span className="font-semibold text-foreground">{parentMaxEth} ETH</span>
                </p>
              </div>
            )}

            {/* Drawer-level error */}
            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[0.8rem] text-destructive">
                {error}
              </p>
            )}

            {/* Section 1: Spending Limits */}
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-semibold text-foreground">1. Spending Limits</h4>

              <div className="flex flex-col gap-2">
                <Label htmlFor="emp-max-amount">Lifetime Spending Limit (ETH)</Label>
                <Input
                  id="emp-max-amount"
                  value={caveatForm.maxAmountEth}
                  className={formErrors.maxAmountEth ? "border-destructive" : ""}
                  disabled={selectedDelegation?.status === "active"}
                  onChange={(e) =>
                    setCaveatForm((f) => ({ ...f, maxAmountEth: e.target.value }))
                  }
                />
                {formErrors.maxAmountEth ? (
                  <p className="text-[0.8rem] text-destructive">{formErrors.maxAmountEth}</p>
                ) : (
                  <p className="text-[0.8rem] text-muted-foreground">
                    Max: {parentMaxEth} ETH (your parent delegation limit).
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <Label>Recurring Allowance</Label>
                <Select
                  value={caveatForm.period}
                  disabled={selectedDelegation?.status === "active"}
                  onValueChange={(period) =>
                    setCaveatForm((f) => ({ ...f, period: period as CaveatForm["period"] }))
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
                <p className="text-[0.8rem] text-muted-foreground">
                  Reset the agent's spending on a recurring schedule.
                </p>
              </div>

              {caveatForm.period !== "none" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="emp-period-amount">Allowance per Period (ETH)</Label>
                  <Input
                    id="emp-period-amount"
                    value={caveatForm.periodAmountEth}
                    className={formErrors.periodAmountEth ? "border-destructive" : ""}
                    disabled={selectedDelegation?.status === "active"}
                    onChange={(e) =>
                      setCaveatForm((f) => ({ ...f, periodAmountEth: e.target.value }))
                    }
                  />
                  {formErrors.periodAmountEth ? (
                    <p className="text-[0.8rem] text-destructive">{formErrors.periodAmountEth}</p>
                  ) : (
                    <p className="text-[0.8rem] text-muted-foreground">
                      How much the agent can spend per {caveatForm.period} period.
                    </p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Section 2: Transaction Restrictions */}
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-semibold text-foreground">2. Transaction Restrictions</h4>

              <div className="flex flex-col gap-2">
                <Label htmlFor="emp-value-lte">Maximum Per-Transaction (ETH)</Label>
                <Input
                  id="emp-value-lte"
                  value={caveatForm.perTransactionCapEth}
                  className={formErrors.perTransactionCapEth ? "border-destructive" : ""}
                  disabled={selectedDelegation?.status === "active"}
                  onChange={(e) =>
                    setCaveatForm((f) => ({ ...f, perTransactionCapEth: e.target.value }))
                  }
                />
                {formErrors.perTransactionCapEth ? (
                  <p className="text-[0.8rem] text-destructive">{formErrors.perTransactionCapEth}</p>
                ) : (
                  <p className="text-[0.8rem] text-muted-foreground">
                    Cap per single transaction. Leave blank for no cap.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="emp-limited-calls-enabled"
                    checked={caveatForm.limitedCallsEnabled}
                    disabled={selectedDelegation?.status === "active"}
                    onCheckedChange={(checked) =>
                      setCaveatForm((f) => ({ ...f, limitedCallsEnabled: checked === true }))
                    }
                  />
                  <Label htmlFor="emp-limited-calls-enabled">Limit Total Transactions</Label>
                </div>
                {caveatForm.limitedCallsEnabled && (
                  <>
                    <Input
                      value={caveatForm.limitedCalls}
                      disabled={selectedDelegation?.status === "active"}
                      onChange={(e) =>
                        setCaveatForm((f) => ({ ...f, limitedCalls: e.target.value }))
                      }
                      className={cn("mt-1", formErrors.limitedCalls ? "border-destructive" : "")}
                    />
                    {formErrors.limitedCalls ? (
                      <p className="text-[0.8rem] text-destructive">{formErrors.limitedCalls}</p>
                    ) : (
                      <p className="text-[0.8rem] text-muted-foreground">
                        Restrict the agent to this many total transactions.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Section 3: Address Whitelist */}
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-semibold text-foreground">3. Address Whitelist</h4>

              <div className="flex flex-col gap-2">
                <Label htmlFor="emp-targets">Permitted Addresses</Label>
                <Input
                  id="emp-targets"
                  value={caveatForm.allowedTargets}
                  className={formErrors.allowedTargets ? "border-destructive" : ""}
                  disabled={selectedDelegation?.status === "active"}
                  onChange={(e) =>
                    setCaveatForm((f) => ({ ...f, allowedTargets: e.target.value }))
                  }
                  placeholder="One auth.address per line or comma-separated"
                />
                {formErrors.allowedTargets ? (
                  <p className="text-[0.8rem] text-destructive">{formErrors.allowedTargets}</p>
                ) : formErrors.allowedTargetsWarning ? (
                  <p className="text-[0.8rem] text-amber-500">{formErrors.allowedTargetsWarning}</p>
                ) : (
                  <p className="text-[0.8rem] text-muted-foreground">
                    Restrict the agent to these recipient addresses only.
                  </p>
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
                  <Label htmlFor="emp-policy-prompt">Natural Language Rules</Label>
                  <Textarea
                    id="emp-policy-prompt"
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
                  <p className="text-[0.8rem] text-muted-foreground">These rules will be fed to the AI Agent. The hard on-chain limits above still apply as a security net.</p>
                </div>
              </div>
            )}

            <div className="pb-4" />
          </div>

          {selectedDelegation?.status !== "active" && (
            <DrawerFooter className="border-t pt-4">
              <Button onClick={handleActivateDelegation} disabled={isPending}>
                {isPending ? (
                  <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <ShieldCheckIcon data-icon="inline-start" />
                )}
                Sign & Activate Delegation
              </Button>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>

      {dashboardState && (
        <ReimbursementAgentDrawer
          isOpen={isReimbursementDrawerOpen}
          onOpenChange={setIsReimbursementDrawerOpen}
          companyId={dashboardState.company.id}
          employeeId={dashboardState.employee.id}
          agentId={dashboardState.agents.find(a => a.name === "Reimbursement Agent")?.id || ""}
        />
      )}
      
      {activeTravelDelegationId && (
        <TravelAgentDrawer
          isOpen={isTravelAgentDrawerOpen}
          onOpenChange={setIsTravelAgentDrawerOpen}
          employee={dashboardState.employee}
          company={dashboardState.company}
          agentId={dashboardState.agents.find(a => a.name === "Travel Agent")?.id || ""}
          delegationId={activeTravelDelegationId}
        />
      )}

      {activeProcurementDelegationId && (
        <ProcurementAgentDrawer
          isOpen={isProcurementAgentDrawerOpen}
          onOpenChange={setIsProcurementAgentDrawerOpen}
          employee={dashboardState.employee}
          company={dashboardState.company}
          agentId={dashboardState.agents.find(a => a.name === "Procurement Agent")?.id || ""}
          delegationId={activeProcurementDelegationId}
        />
      )}
    </DashboardShell>
  );
}
