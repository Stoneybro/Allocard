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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LoaderCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  GlobeIcon,
  SendIcon,
  SparklesIcon,
  DollarSignIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  CoinsIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { agoraEmployeeMessage, type AgoraProgram } from "@/lib/agora/shared";
import { FX_RATES, convertToAusd, type SupportedCurrency } from "@/lib/agora/fx";
import { parseUserOpError } from "@/lib/error-parser";
import { getTxExplorerUrl, TOKEN_SYMBOL } from "@/lib/chain";

type DrawerStep = "form" | "extracting" | "submitting" | "success" | "error";

export function AgoraRemittanceDrawer({
  isOpen,
  onOpenChange,
  companyId,
  employeeId,
  program,
  accountReady,
  onRefresh,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  employeeId: string;
  program: AgoraProgram;
  accountReady: boolean;
  onRefresh: () => Promise<void>;
}) {
  const canSubmit = program.status === "ready" && accountReady;
  const [step, setStep] = useState<DrawerStep>("form");
  const [fileBase64, setFileBase64] = useState<string | null>(null);

  // Form fields
  const [contractorName, setContractorName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [currency, setCurrency] = useState<SupportedCurrency>("EUR");
  const [foreignAmount, setForeignAmount] = useState("");
  const [description, setDescription] = useState("");

  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Computed FX Conversion
  const parsedAmount = parseFloat(foreignAmount) || 0;
  const conversion = convertToAusd(parsedAmount, currency);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setStep("form");
        setFileBase64(null);
        setContractorName("");
        setRecipientAddress("");
        setCurrency("EUR");
        setForeignAmount("");
        setDescription("");
        setResultMessage(null);
        setTxHash(null);
        setErrorMessage(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
      toast.info("Invoice image attached. Fill details or extract.");
    };
    reader.readAsDataURL(file);
  };

  const handleExtractWithAI = async () => {
    if (!fileBase64) {
      toast.error("Please upload an invoice image first");
      return;
    }
    try {
      setStep("extracting");
      const res = await fetch("/api/agents/reimbursement/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptBase64: fileBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract invoice");

      if (data.extraction) {
        if (data.extraction.merchant) setContractorName(data.extraction.merchant);
        if (data.extraction.totalUsd) setForeignAmount(data.extraction.totalUsd);
        if (data.extraction.suggestedPurpose) setDescription(data.extraction.suggestedPurpose);
        toast.success("AI extracted invoice details!");
      }
    } catch (err: any) {
      toast.error(err.message || "AI extraction failed");
    } finally {
      setStep("form");
    }
  };

  const handleExecuteRemittance = async () => {
    if (!contractorName.trim()) {
      toast.error("Contractor / Payee name is required");
      return;
    }
    if (!recipientAddress.trim() || !recipientAddress.startsWith("0x") || recipientAddress.length !== 42) {
      toast.error("Valid Monad recipient wallet address (0x...) is required");
      return;
    }
    if (parsedAmount <= 0) {
      toast.error("Please enter a valid invoice amount");
      return;
    }
    if (!description.trim()) {
      toast.error("Business justification / description is required");
      return;
    }

    try {
      setStep("submitting");
      setErrorMessage(null);

      const res = await fetch("/api/agents/agora/remit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          employeeId,
          contractorName: contractorName.trim(),
          recipientAddress: recipientAddress.trim(),
          originalCurrency: currency,
          originalAmount: parsedAmount.toString(),
          amountAusd: conversion.amountAusd,
          description: description.trim(),
          receiptBase64: fileBase64,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const parsed = parseUserOpError(data.error) || data.error || "Remittance execution failed";
        setErrorMessage(parsed);
        setStep("error");
        toast.error("Cross-Border Remittance Failed", { description: parsed });
        return;
      }

      setTxHash(data.txHash);
      setResultMessage(
        `Successfully remitted ${conversion.amountAusd} ${TOKEN_SYMBOL} to ${contractorName} (${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}) on Monad Testnet.`
      );
      setStep("success");
      await onRefresh();
      toast.success("Cross-Border Remittance Settled!", {
        description: `Paid ${conversion.amountAusd} ${TOKEN_SYMBOL} (${currency} ${parsedAmount}) in 0.8s on Monad`,
        action: data.txHash
          ? {
              label: "Explorer",
              onClick: () => window.open(getTxExplorerUrl(data.txHash), "_blank"),
            }
          : undefined,
      });
    } catch (err: any) {
      const parsed = parseUserOpError(err);
      setErrorMessage(parsed);
      setStep("error");
      toast.error("Cross-Border Remittance Failed", { description: parsed });
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-center sm:text-center">
          <DrawerTitle className="flex items-center justify-center gap-2 text-center text-lg font-semibold">
            <GlobeIcon className="size-5 text-primary" />
            Agora Cross-Border Remittance
          </DrawerTitle>
          <DrawerDescription>
            Settle international contractor invoices and foreign expenses instantly in Agora AUSD with 0% bank wire fees.
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 flex flex-col gap-4 max-w-lg mx-auto w-full overflow-y-auto max-h-[70vh]">
          {!canSubmit && step === "form" ? (
            <div className="flex flex-col gap-3 py-4">
              <Alert>
                <GlobeIcon className="size-4" />
                <AlertDescription className="text-sm">
                  {agoraEmployeeMessage(program.status)}
                </AlertDescription>
              </Alert>
            </div>
          ) : step === "form" ? (
            <div className="flex flex-col gap-4">
              {/* Remittance Pool Capacity Indicator */}
              {program.status === "ready" && program.remainingAmount !== null && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs shadow-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="size-4 text-emerald-500" />
                    <span className="text-muted-foreground">Authorized Remittance Pool:</span>
                  </div>
                  <span className="font-mono font-semibold text-foreground">
                    {program.remainingAmount} {TOKEN_SYMBOL} remaining
                  </span>
                </div>
              )}

              {/* Optional Invoice Upload */}
              <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-dashed border-border/80 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label htmlFor="invoice-upload" className="text-xs font-medium cursor-pointer">
                    Attach Invoice (Optional)
                  </Label>
                  {fileBase64 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-primary"
                      onClick={handleExtractWithAI}
                    >
                      <SparklesIcon className="size-3 mr-1" />
                      Auto-fill with AI
                    </Button>
                  )}
                </div>
                <Input
                  id="invoice-upload"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="cursor-pointer text-xs"
                />
              </div>

              {/* Contractor Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contractor-name" className="text-xs">
                    Contractor / Payee Name
                  </Label>
                  <Input
                    id="contractor-name"
                    placeholder="e.g. Yuki Tanaka"
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="recipient-address" className="text-xs">
                    Recipient Monad Address (0x...)
                  </Label>
                  <Input
                    id="recipient-address"
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* Currency & Amount */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5 col-span-1">
                  <Label htmlFor="currency-select" className="text-xs">
                    Invoice Currency
                  </Label>
                  <Select value={currency} onValueChange={(val) => setCurrency(val as SupportedCurrency)}>
                    <SelectTrigger id="currency-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FX_RATES).map(([code, meta]) => (
                        <SelectItem key={code} value={code}>
                          {meta.symbol} {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <Label htmlFor="foreign-amount" className="text-xs">
                    Invoice Amount ({currency})
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">
                      {FX_RATES[currency]?.symbol}
                    </span>
                    <Input
                      id="foreign-amount"
                      type="number"
                      placeholder="0.00"
                      className="pl-8"
                      value={foreignAmount}
                      onChange={(e) => setForeignAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Live FX & Savings Calculator Card */}
              {parsedAmount > 0 && (
                <Card className="border border-blue-500/20 bg-blue-500/5 shadow-xs">
                  <CardContent className="p-3.5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Agora FX Mid-Market Rate:</span>
                      <span className="font-mono font-medium">
                        1 {currency} = {conversion.rateApplied} {TOKEN_SYMBOL}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-blue-500/10 pt-2">
                      <span className="text-sm font-semibold">Total Settlement:</span>
                      <span className="text-base font-bold font-mono text-primary flex items-center gap-1">
                        {conversion.amountAusd} {TOKEN_SYMBOL}
                      </span>
                    </div>

                    <div className="rounded bg-background/80 p-2 border border-border/50 text-[11px] flex flex-col gap-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Traditional SWIFT Wire Cost:</span>
                        <span className="line-through font-mono">
                          ~${(conversion.traditionalWireFeeUsd + conversion.traditionalFxSpreadUsd).toFixed(2)} (3-5 days)
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                        <span>Allocard Monad Execution:</span>
                        <span className="flex items-center gap-0.5">
                          <CheckCircleIcon className="size-3" /> Saved ${conversion.totalSavedUsd} (0.8s finality)
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Business Purpose / Description */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="purpose" className="text-xs">
                  Business Purpose / Deliverables
                </Label>
                <Textarea
                  id="purpose"
                  rows={2}
                  placeholder="e.g. Backend API development & Monad node integration for March sprint."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          ) : step === "extracting" ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <LoaderCircleIcon className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Qwen AI is extracting invoice line items & tax details...</p>
            </div>
          ) : step === "submitting" ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <LoaderCircleIcon className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Executing cross-border settlement in Agora AUSD on Monad...</p>
              <p className="text-xs text-muted-foreground">Verifying remittance pool authorization & broadcasting settlement on Monad</p>
            </div>
          ) : step === "success" ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className="size-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircleIcon className="size-7" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold">Remittance Successfully Settled!</h3>
                <p className="text-xs text-muted-foreground max-w-sm">{resultMessage}</p>
              </div>

              <div className="w-full rounded-lg border border-border bg-card p-3 text-xs flex flex-col gap-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payee:</span>
                  <span>{contractorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Settled Amount:</span>
                  <span className="font-bold text-primary">{conversion.amountAusd} {TOKEN_SYMBOL}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Foreign Value:</span>
                  <span>{FX_RATES[currency]?.symbol}{parsedAmount} {currency}</span>
                </div>
                {txHash && (
                  <div className="flex justify-between pt-1 border-t border-border">
                    <span className="text-muted-foreground">Monad Tx:</span>
                    <a
                      href={getTxExplorerUrl(txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="size-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <XCircleIcon className="size-7" />
              </div>
              <h3 className="text-base font-semibold">Remittance Failed</h3>
              <p className="text-xs text-muted-foreground max-w-sm">{errorMessage}</p>
            </div>
          )}
        </div>

        <DrawerFooter className="max-w-lg mx-auto w-full">
          {step === "form" && canSubmit && (
            <Button onClick={handleExecuteRemittance} className="w-full">
              <SendIcon className="size-4 mr-2" />
              Settle {parsedAmount > 0 ? `${conversion.amountAusd} ${TOKEN_SYMBOL}` : "Remittance"}
            </Button>
          )}
          {(step === "success" || step === "error") && (
            <Button
              variant="outline"
              onClick={() => {
                if (step === "success") onOpenChange(false);
                else setStep("form");
              }}
              className="w-full"
            >
              {step === "success" ? "Done" : "Try Again"}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
