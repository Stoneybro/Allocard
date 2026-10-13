"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  LoaderCircleIcon,
  CheckCircleIcon,
  ServerIcon,
  ShieldCheckIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  CopyIcon,
  CpuIcon,
  SparklesIcon,
  ArrowRightIcon,
  RotateCcwIcon,
  LayersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { parseUserOpError } from "@/lib/error-parser";
import { getTxExplorerUrl, TOKEN_SYMBOL } from "@/lib/chain";
import {
  SPONSOR_MERCHANTS,
  type SponsorMerchant,
  type SponsorPlan,
  getSponsorMerchant,
} from "@/lib/merchants";
import type { DevOpsRecommendation } from "@/lib/ai";

const PRESET_PROMPTS = [
  {
    label: "Dedicated Monad RPC",
    prompt: "We need a dedicated Monad RPC node with WebSocket streaming for our frontend dApp under $100 AUSD.",
    targetPrice: "100",
  },
  {
    label: "Security Audit & Scan",
    prompt: "We need an automated smart contract security audit and reentrancy vulnerability scan before deployment.",
    targetPrice: "250",
  },
  {
    label: "GraphQL Event Indexer",
    prompt: "We need a real-time event indexing cluster with GraphQL endpoints for our token contracts under $80.",
    targetPrice: "80",
  },
  {
    label: "High-Throughput Stream",
    prompt: "We need high-throughput direct P2P peering and sub-50ms latency RPC stream for our trading bot.",
    targetPrice: "150",
  },
];

export function DevOpsAgentDrawer({
  isOpen,
  onOpenChange,
  employee,
  company,
  agentId,
  delegationId,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
  company: any;
  agentId: string;
  delegationId: string;
}) {
  // Navigation mode: "agent" (default conversational scour) vs "catalog" (manual browse)
  const [viewMode, setViewMode] = useState<"agent" | "catalog">("agent");
  const [scourPhase, setScourPhase] = useState<"input" | "scouring" | "result">("input");

  // User requirement inputs
  const [userPrompt, setUserPrompt] = useState("");
  const [targetBudget, setTargetBudget] = useState("");

  // Agent recommendation result
  const [recommendation, setRecommendation] = useState<DevOpsRecommendation | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<SponsorMerchant>(SPONSOR_MERCHANTS[0]);
  const [selectedPlan, setSelectedPlan] = useState<SponsorPlan>(SPONSOR_MERCHANTS[0].plans[0]);

  // Catalog category filter (for manual mode)
  const [catalogCategory, setCatalogCategory] = useState<"all" | "rpc" | "security" | "indexing">("all");

  // Procurement execution states
  const [executionStatus, setExecutionStatus] = useState<"idle" | "booking" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [provisionedCredential, setProvisionedCredential] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setViewMode("agent");
        setScourPhase("input");
        setUserPrompt("");
        setTargetBudget("");
        setRecommendation(null);
        setSelectedMerchant(SPONSOR_MERCHANTS[0]);
        setSelectedPlan(SPONSOR_MERCHANTS[0].plans[0]);
        setExecutionStatus("idle");
        setErrorMessage(null);
        setTxHash(null);
        setProvisionedCredential(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 1. Agent Scouring API Call
  const handleScour = async (customPrompt?: string, customBudget?: string) => {
    const promptToSend = customPrompt !== undefined ? customPrompt : userPrompt;
    const budgetToSend = customBudget !== undefined ? customBudget : targetBudget;

    if (!promptToSend.trim()) {
      toast.warning("Please describe what your team needs", {
        description: "e.g. Dedicated Monad RPC node, smart contract audit, or event indexer.",
      });
      return;
    }

    try {
      setScourPhase("scouring");
      setErrorMessage(null);

      const res = await fetch("/api/agents/devops/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          targetBudgetAusd: budgetToSend ? parseFloat(budgetToSend) : null,
          delegationId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to scour ecosystem");
      }

      setRecommendation(data.recommendation);
      if (data.merchant && data.plan) {
        setSelectedMerchant(data.merchant);
        setSelectedPlan(data.plan);
      }
      setScourPhase("result");
    } catch (err: any) {
      console.warn("DevOps agent scour notice:", err);
      toast.error("Agent Scouring Notice", {
        description: err instanceof Error ? err.message : "Could not complete analysis",
      });
      setScourPhase("input");
    }
  };

  // 2. On-Chain Procurement Execution
  const handleProcure = async () => {
    try {
      setExecutionStatus("booking");
      setErrorMessage(null);

      const res = await fetch("/api/agents/devops/procure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: selectedMerchant.id,
          planId: selectedPlan.id,
          notes: userPrompt || recommendation?.headline || "Procured via Cloud & Tooling Agent",
          delegationId,
          agentId,
          employeeId: employee.id,
          companyId: company.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = parseUserOpError(data.error) || data.error || "Procurement execution failed";
        setExecutionStatus("error");
        setErrorMessage(errorMsg);
        toast.error("Procurement Failed", { description: errorMsg });
        return;
      }

      setExecutionStatus("success");
      setTxHash(data.txHash);
      setProvisionedCredential(data.provisionedCredential || selectedPlan.sampleCredential);
      toast.success("Infrastructure Procured Successfully!", {
        description: `${selectedMerchant.name} — ${selectedPlan.name} (${selectedPlan.priceAusd} ${TOKEN_SYMBOL}) on Monad Testnet`,
        action: data.txHash
          ? {
              label: "Explorer",
              onClick: () => window.open(getTxExplorerUrl(data.txHash), "_blank"),
            }
          : undefined,
      });
    } catch (err: any) {
      const errorMsg = parseUserOpError(err);
      setExecutionStatus("error");
      setErrorMessage(errorMsg);
      toast.error("Cloud & Tooling Procurement Failed", { description: errorMsg });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const filteredMerchants =
    catalogCategory === "all"
      ? SPONSOR_MERCHANTS
      : SPONSOR_MERCHANTS.filter((m) => m.category === catalogCategory);

  const CategoryIcon =
    selectedMerchant.category === "security"
      ? ShieldCheckIcon
      : selectedMerchant.category === "indexing"
      ? DatabaseIcon
      : ServerIcon;

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-center sm:text-center pb-2">
          <div className="flex items-center justify-center gap-2">
            <CpuIcon className="size-5 text-foreground" />
            <DrawerTitle className="text-base font-semibold tracking-tight">
              Cloud & Tooling Agent
            </DrawerTitle>
            <Badge variant="outline" className="text-[10px] font-mono">
              Monad Ecosystem
            </Badge>
          </div>
          <DrawerDescription className="text-xs text-muted-foreground max-w-md mx-auto">
            {executionStatus === "success"
              ? "Your requested infrastructure or tooling has been provisioned directly from the verified merchant."
              : "Specify your cloud, RPC, or tooling requirements. The agent scours verified Monad sponsors and recommends the best plan for your price."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 flex flex-col gap-4 max-w-xl mx-auto w-full overflow-y-auto max-h-[70vh]">
          {executionStatus === "success" ? (
            /* ── Success Screen ── */
            <div className="flex flex-col items-center justify-center py-6 gap-4 text-center">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-foreground border border-border">
                <CheckCircleIcon className="size-6 text-foreground" />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-foreground">Infrastructure Successfully Procured!</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Funds transferred directly from Company Treasury to {selectedMerchant.name}&apos;s verified merchant account on Monad.
                </p>
              </div>

              {/* Provisioned Credential Box */}
              <div className="w-full rounded-lg border border-border bg-card p-3.5 text-xs flex flex-col gap-2.5 text-left font-mono">
                <div className="flex justify-between items-center text-muted-foreground pb-1.5 border-b border-border/80">
                  <span className="font-sans font-semibold text-foreground">Provisioned Credentials</span>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    Active
                  </Badge>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground font-sans">API Endpoint / Certificate:</span>
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50 border border-border/60 text-xs break-all">
                    <span>{provisionedCredential}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0 ml-2"
                      onClick={() => copyToClipboard(provisionedCredential || "")}
                    >
                      <CopyIcon className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between pt-1 border-t border-border/50 text-[11px]">
                  <span className="text-muted-foreground">Provider:</span>
                  <span className="text-foreground font-sans font-medium">{selectedMerchant.name}</span>
                </div>

                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Settled Amount:</span>
                  <span className="font-semibold text-foreground">
                    {selectedPlan.priceAusd} {TOKEN_SYMBOL}
                  </span>
                </div>

                {txHash && (
                  <div className="flex justify-between pt-1 border-t border-border/50 text-[11px]">
                    <span className="text-muted-foreground">Monad Tx:</span>
                    <a
                      href={getTxExplorerUrl(txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:underline flex items-center gap-1 font-mono"
                    >
                      {txHash.slice(0, 10)}...{txHash.slice(-8)}
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : viewMode === "agent" ? (
            /* ── Agent Mode (Primary Conversational Flow) ── */
            scourPhase === "scouring" ? (
              /* Scouring Progress Animation */
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <LoaderCircleIcon className="size-8 animate-spin text-foreground" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-foreground">Agent is scouring Monad sponsors...</p>
                  <p className="text-xs text-muted-foreground">
                    Analyzing Chainstack, Crouton Digital, Ack3 AI, and Envio pricing & latency
                  </p>
                </div>

                <div className="w-full max-w-sm rounded-lg border border-border/80 bg-muted/20 p-3 text-left space-y-2 mt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-foreground animate-ping" />
                    <span>Matching requirements against live merchant specifications...</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-foreground" />
                    <span>Verifying sub-delegated budget constraints on Monad...</span>
                  </div>
                </div>
              </div>
            ) : scourPhase === "result" && recommendation ? (
              /* Recommendation Screen */
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="size-4 text-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Agent Recommendation
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {Math.round(recommendation.confidence * 100)}% match
                  </Badge>
                </div>

                {/* Winning Plan Hero Card */}
                <Card className="border-border bg-card p-4 flex flex-col gap-3 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-md bg-muted flex items-center justify-center border border-border">
                        <CategoryIcon className="size-4 text-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">{selectedMerchant.name}</h4>
                          <span className="text-xs text-muted-foreground font-mono">·</span>
                          <span className="text-xs text-muted-foreground font-mono">{selectedMerchant.categoryLabel}</span>
                        </div>
                        <p className="text-xs font-semibold text-foreground/90 mt-0.5">{selectedPlan.name}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold font-mono text-foreground">
                        {selectedPlan.priceAusd} {TOKEN_SYMBOL}
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {selectedPlan.cadence === "monthly" ? "/ month" : "per scan"}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-border/50">
                    {selectedPlan.description}
                  </p>

                  {/* Plan Features */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedPlan.features.map((feat) => (
                      <span
                        key={feat}
                        className="text-[11px] px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/50 font-mono"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </Card>

                {/* Agent Technical Reasoning */}
                <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <CpuIcon className="size-3.5 text-foreground" />
                    <span>Why the agent selected this plan:</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {recommendation.reasoning}
                  </p>
                </div>

                {/* Alternatives Evaluated */}
                {recommendation.alternativesCompared && recommendation.alternativesCompared.length > 0 && (
                  <div className="p-3 rounded-lg border border-border/60 bg-card text-xs flex flex-col gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Alternatives Evaluated & Ruled Out:
                    </span>
                    <div className="space-y-1.5">
                      {recommendation.alternativesCompared.map((alt, idx) => (
                        <div key={idx} className="flex justify-between items-start gap-2 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {alt.merchantName} ({alt.planName} · {alt.priceAusd} {TOKEN_SYMBOL}):
                          </span>
                          <span className="text-right flex-1">{alt.reasonNotChosen}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verified Merchant Address */}
                <div className="flex items-center justify-between text-[11px] pt-1 text-muted-foreground font-mono">
                  <span>Merchant Address:</span>
                  <span className="text-foreground">{selectedMerchant.merchantAddress}</span>
                </div>

                {/* Error Banner if any */}
                {errorMessage && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                    {errorMessage}
                  </div>
                )}

                {/* Refine / Switch Prompt */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setScourPhase("input")}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcwIcon className="size-3" />
                    Refine requirements
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("catalog")}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <LayersIcon className="size-3" />
                    Browse full catalog manually
                  </button>
                </div>
              </div>
            ) : (
              /* Input Screen (Prompt the Agent) */
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="team-req" className="text-xs font-semibold text-foreground">
                    What does your team need?
                  </Label>
                  <Textarea
                    id="team-req"
                    rows={3}
                    placeholder="e.g. Dedicated Monad RPC with WebSocket support for our frontend dApp under $100 AUSD..."
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    className="text-xs resize-none"
                  />
                </div>

                {/* Target Price Ceiling (Optional) */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="target-price" className="text-xs text-muted-foreground">
                    Target Budget Limit (Optional)
                  </Label>
                  <div className="relative">
                    <Input
                      id="target-price"
                      type="number"
                      placeholder="e.g. 100"
                      value={targetBudget}
                      onChange={(e) => setTargetBudget(e.target.value)}
                      className="text-xs pr-16"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-mono">
                      {TOKEN_SYMBOL}
                    </span>
                  </div>
                </div>

                {/* Quick 1-Click Presets */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Quick Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_PROMPTS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setUserPrompt(preset.prompt);
                          setTargetBudget(preset.targetPrice);
                          void handleScour(preset.prompt, preset.targetPrice);
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-md border border-border/80 bg-muted/30 text-foreground hover:bg-accent hover:border-border transition-colors cursor-pointer font-medium"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual catalog fallback link */}
                <div className="pt-2 border-t border-border/50 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setViewMode("catalog")}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LayersIcon className="size-3.5" />
                    <span>Prefer to select from the catalog manually?</span>
                  </button>
                </div>
              </div>
            )
          ) : (
            /* ── Manual Catalog Mode ── */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <span className="text-xs font-semibold text-foreground">Verified Sponsor Catalog</span>
                <button
                  type="button"
                  onClick={() => setViewMode("agent")}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <SparklesIcon className="size-3" />
                  Back to Agent
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5 p-1 bg-muted/50 rounded-lg text-xs font-medium border border-border/50">
                {(
                  [
                    { id: "all", label: "All Services" },
                    { id: "rpc", label: "RPC Nodes" },
                    { id: "security", label: "Security & Audits" },
                    { id: "indexing", label: "Indexing" },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCatalogCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      catalogCategory === cat.id
                        ? "bg-card text-foreground shadow-2xs font-semibold border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Merchant Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredMerchants.map((merchant) => {
                  const isSelected = selectedMerchant.id === merchant.id;
                  const Icon =
                    merchant.category === "security"
                      ? ShieldCheckIcon
                      : merchant.category === "indexing"
                      ? DatabaseIcon
                      : ServerIcon;

                  return (
                    <Card
                      key={merchant.id}
                      onClick={() => {
                        setSelectedMerchant(merchant);
                        setSelectedPlan(merchant.plans[0]);
                      }}
                      className={`cursor-pointer transition-all border p-3 flex flex-col justify-between gap-2 ${
                        isSelected
                          ? "border-foreground bg-muted/40 shadow-xs"
                          : "border-border/70 hover:border-border bg-card"
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                            <Icon className="size-3.5 text-foreground" />
                            {merchant.name}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {merchant.categoryLabel}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          {merchant.tagline}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
                        <span className="text-muted-foreground">{merchant.plans.length} plan{merchant.plans.length > 1 ? "s" : ""}</span>
                        <span className="font-semibold text-foreground">
                          from {merchant.plans[0].priceAusd} {TOKEN_SYMBOL}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Plan Selection for Selected Merchant */}
              <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {selectedMerchant.name} Plans
                  </span>
                  <a
                    href={selectedMerchant.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    Docs <ExternalLinkIcon className="size-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {selectedMerchant.plans.map((plan) => {
                    const isPlanSelected = selectedPlan.id === plan.id;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`p-2.5 rounded-md border cursor-pointer text-xs flex flex-col justify-between transition-all ${
                          isPlanSelected
                            ? "border-foreground bg-muted/50 shadow-xs"
                            : "border-border/80 bg-background hover:border-border"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-semibold">{plan.name}</span>
                          <span className="font-bold font-mono text-foreground">
                            {plan.priceAusd} {TOKEN_SYMBOL}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-tight">
                          {plan.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <DrawerFooter className="max-w-xl mx-auto w-full pt-2">
          {executionStatus === "success" ? (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full text-xs font-semibold">
              Done
            </Button>
          ) : scourPhase === "scouring" ? (
            <Button disabled className="w-full text-xs font-semibold">
              <LoaderCircleIcon className="size-3.5 mr-2 animate-spin" />
              Scouring Ecosystem...
            </Button>
          ) : scourPhase === "result" || viewMode === "catalog" ? (
            <Button
              onClick={handleProcure}
              disabled={executionStatus === "booking"}
              className="w-full text-xs font-semibold cursor-pointer"
            >
              {executionStatus === "booking" ? (
                <>
                  <LoaderCircleIcon className="size-3.5 mr-2 animate-spin" />
                  Executing On-Chain Purchase on Monad...
                </>
              ) : (
                <>
                  <CpuIcon className="size-3.5 mr-2" />
                  Approve & Procure {selectedPlan.name} ({selectedPlan.priceAusd} {TOKEN_SYMBOL})
                </>
              )}
            </Button>
          ) : (
            <Button onClick={() => void handleScour()} className="w-full text-xs font-semibold cursor-pointer">
              <SparklesIcon className="size-3.5 mr-2" />
              Scour Ecosystem & Compare Plans
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
