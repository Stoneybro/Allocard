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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  LoaderCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ServerIcon,
  ShieldCheckIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  CopyIcon,
  CpuIcon,
} from "lucide-react";
import { toast } from "sonner";
import { parseUserOpError } from "@/lib/error-parser";
import { getTxExplorerUrl, TOKEN_SYMBOL } from "@/lib/chain";
import { SPONSOR_MERCHANTS, type SponsorMerchant, type SponsorPlan } from "@/lib/merchants";

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
  const [selectedCategory, setSelectedCategory] = useState<"all" | "rpc" | "security" | "indexing">("all");
  const [selectedMerchant, setSelectedMerchant] = useState<SponsorMerchant>(SPONSOR_MERCHANTS[0]);
  const [selectedPlan, setSelectedPlan] = useState<SponsorPlan>(SPONSOR_MERCHANTS[0].plans[0]);
  const [notes, setNotes] = useState("");

  const [status, setStatus] = useState<"idle" | "evaluating" | "ready_to_book" | "booking" | "success" | "error">("idle");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [provisionedCredential, setProvisionedCredential] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setSelectedCategory("all");
        setSelectedMerchant(SPONSOR_MERCHANTS[0]);
        setSelectedPlan(SPONSOR_MERCHANTS[0].plans[0]);
        setNotes("");
        setStatus("idle");
        setResultMessage(null);
        setTxHash(null);
        setProvisionedCredential(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const filteredMerchants = selectedCategory === "all"
    ? SPONSOR_MERCHANTS
    : SPONSOR_MERCHANTS.filter((m) => m.category === selectedCategory);

  const handleSelectMerchant = (merchant: SponsorMerchant) => {
    setSelectedMerchant(merchant);
    setSelectedPlan(merchant.plans[0]);
    setStatus("idle");
  };

  const handleProcure = async () => {
    try {
      setStatus("booking");
      setResultMessage(null);

      const res = await fetch("/api/agents/devops/procure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: selectedMerchant.id,
          planId: selectedPlan.id,
          notes,
          delegationId,
          agentId,
          employeeId: employee.id,
          companyId: company.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = parseUserOpError(data.error) || data.error || "Procurement execution failed";
        setStatus("error");
        setResultMessage(errorMsg);
        toast.error("DevOps Procurement Failed", { description: errorMsg });
        return;
      }

      setStatus("success");
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
      setStatus("error");
      setResultMessage(errorMsg);
      toast.error("DevOps Procurement Failed", { description: errorMsg });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-center sm:text-center">
          <DrawerTitle className="flex items-center justify-center gap-2 text-center text-lg font-semibold">
            <CpuIcon className="size-5 text-primary" />
            DevOps Procurement Agent
          </DrawerTitle>
          <DrawerDescription>
            Procure verified Monad ecosystem infrastructure (RPC nodes, Ack3 security audits, Envio indexers) within your delegated budget.
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 flex flex-col gap-4 max-w-xl mx-auto w-full overflow-y-auto max-h-[70vh]">
          {status === "idle" || status === "evaluating" || status === "booking" || status === "error" ? (
            <div className="flex flex-col gap-4">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5 p-1 bg-muted rounded-lg text-xs font-medium">
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
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      selectedCategory === cat.id
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Merchant Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      onClick={() => handleSelectMerchant(merchant)}
                      className={`cursor-pointer transition-all border p-3 flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border/70 hover:border-border bg-card"
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm flex items-center gap-1.5">
                            <Icon className="size-4 text-primary" />
                            {merchant.name}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {merchant.categoryLabel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-tight">
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

              {/* Selected Merchant Plan Selection */}
              <div className="flex flex-col gap-2 p-3.5 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Configure: {selectedMerchant.name} Plan
                  </span>
                  <a
                    href={selectedMerchant.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Partner Docs <ExternalLinkIcon className="size-3" />
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
                            ? "border-primary bg-primary/10 shadow-xs"
                            : "border-border/80 bg-background hover:border-border"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-semibold">{plan.name}</span>
                          <span className="font-bold font-mono text-primary">
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

                {/* Verified Recipient Merchant Address */}
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border/40 text-muted-foreground font-mono">
                  <span>Merchant Address:</span>
                  <span className="text-foreground">{selectedMerchant.merchantAddress}</span>
                </div>
              </div>

              {/* Technical Requirements / Notes */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="infra-notes" className="text-xs">
                  Project Context / Deployment Target (Optional)
                </Label>
                <Textarea
                  id="infra-notes"
                  rows={2}
                  placeholder="e.g. Dedicated endpoint for latency-sensitive arbitrage indexing on Monad."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {status === "error" && (
                <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
                  {resultMessage}
                </div>
              )}
            </div>
          ) : status === "success" ? (
            <div className="flex flex-col items-center justify-center py-6 gap-4 text-center">
              <div className="size-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircleIcon className="size-7" />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold">Infrastructure Successfully Procured!</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Funds transferred directly from Company Treasury to {selectedMerchant.name}&apos;s verified merchant address.
                </p>
              </div>

              {/* Provisioned Credential Box */}
              <div className="w-full rounded-lg border border-border bg-card p-3.5 text-xs flex flex-col gap-2.5 text-left font-mono">
                <div className="flex justify-between items-center text-muted-foreground pb-1.5 border-b border-border">
                  <span className="font-sans font-semibold text-foreground">Provisioned Credentials</span>
                  <Badge variant="secondary" className="text-[10px]">Active</Badge>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground font-sans">API Endpoint / Certificate:</span>
                  <div className="flex items-center justify-between p-2 rounded bg-muted/60 text-xs break-all">
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

                <div className="flex justify-between pt-1 border-t border-border/40 text-[11px]">
                  <span className="text-muted-foreground">Sponsor Merchant:</span>
                  <span className="text-foreground">{selectedMerchant.name}</span>
                </div>

                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Paid:</span>
                  <span className="font-bold text-primary">{selectedPlan.priceAusd} {TOKEN_SYMBOL}</span>
                </div>

                {txHash && (
                  <div className="flex justify-between pt-1 border-t border-border/40 text-[11px]">
                    <span className="text-muted-foreground">Monad Tx:</span>
                    <a
                      href={getTxExplorerUrl(txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {txHash.slice(0, 10)}...{txHash.slice(-8)}
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <DrawerFooter className="max-w-xl mx-auto w-full">
          {status === "idle" || status === "error" ? (
            <Button onClick={handleProcure} className="w-full">
              <CpuIcon className="size-4 mr-2" />
              Approve & Procure {selectedPlan.name} ({selectedPlan.priceAusd} {TOKEN_SYMBOL})
            </Button>
          ) : status === "booking" ? (
            <Button disabled className="w-full">
              <LoaderCircleIcon className="size-4 mr-2 animate-spin" />
              Executing On-Chain Purchase on Monad...
            </Button>
          ) : status === "success" ? (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          ) : null}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
