"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { parseUserOpError } from "@/lib/error-parser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Loader2, UploadCloud, ShieldAlert, ShieldCheck } from "lucide-react";
import { parseEther } from "viem";
import { getTxExplorerUrl, TOKEN_SYMBOL } from "@/lib/chain";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  delegationId: string;
  remainingBalanceEth: string;
  onExecute: (details: { toAddress: string; amountEth: string; purpose?: string; isFlagged?: boolean }) => Promise<string>;
  onVerifyReceipt: (txHash: string, imageBase64: string) => Promise<any>;
};

export function DirectSpendForm({ delegationId, remainingBalanceEth, onExecute, onVerifyReceipt }: Props) {
  const [step, setStep] = useState<"input" | "receipt" | "done">("input");
  
  const [toAddress, setToAddress] = useState("");
  const [amountEth, setAmountEth] = useState("");
  
  const [txHash, setTxHash] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const validateInputs = (): boolean => {
    const trimmedTo = toAddress.trim();
    if (!trimmedTo || !amountEth) {
      setError("Please fill in recipient address and amount.");
      return false;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedTo)) {
      setError("Please enter a valid recipient address (0x...).");
      return false;
    }

    let parsedAmount: bigint;
    try {
      parsedAmount = parseEther(amountEth);
      if (parsedAmount <= 0n) {
        setError(`Amount must be greater than 0 ${TOKEN_SYMBOL}.`);
        return false;
      }
    } catch {
      setError(`Invalid ${TOKEN_SYMBOL} amount format.`);
      return false;
    }

    try {
      const remaining = parseEther(remainingBalanceEth);
      if (parsedAmount > remaining) {
        setError(`Amount exceeds your remaining delegated balance (${remainingBalanceEth} ${TOKEN_SYMBOL}).`);
        return false;
      }
    } catch {
      // Ignore parse failure on remaining balance
    }

    setError(null);
    return true;
  };

  const handleStartExecute = () => {
    if (validateInputs()) {
      setIsConfirmOpen(true);
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);
    try {
      const hash = await onExecute({
        toAddress: toAddress.trim(),
        amountEth: amountEth.trim(),
      });
      setTxHash(hash);
      setStep("receipt");
      setIsConfirmOpen(false);
      toast.success("Expense Executed Successfully", {
        description: `${amountEth} ${TOKEN_SYMBOL} sent to ${toAddress.slice(0, 6)}...${toAddress.slice(-4)} • Monad Testnet`,
        action: {
          label: "View Explorer",
          onClick: () => window.open(getTxExplorerUrl(hash), "_blank"),
        },
      });
    } catch (err: any) {
      console.error(err);
      const parsed = parseUserOpError(err);
      setError(parsed);
      toast.error("Expense Execution Failed", {
        description: parsed,
      });
      setIsConfirmOpen(false);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setReceiptImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReceipt = async () => {
    if (!txHash || !receiptImage) return;

    setIsSubmittingReceipt(true);
    try {
      const result = await onVerifyReceipt(txHash, receiptImage);
      setVerificationResult(result);
      setStep("done");
      if (result?.verified) {
        toast.success("Receipt Verified", {
          description: "Qwen AI verified your receipt against company expense policy.",
        });
      } else {
        toast.warning("Receipt Flagged", {
          description: result?.reasoning || "Expense flagged for employer policy review.",
        });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to verify receipt with AI");
      toast.error("Verification Failed", {
        description: "Could not process receipt with AI vision.",
      });
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xs border-border/80 bg-card">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Direct Corporate Spend
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Settle vendor invoices or direct business expenses from your delegated corporate allowance on Monad Testnet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "input" && (
          <div className="space-y-4">
            {error && (
              <Alert className="border-destructive/60 bg-destructive/10 text-destructive py-2.5">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">Validation Error</AlertTitle>
                <AlertDescription className="text-xs mt-0.5">{error}</AlertDescription>
              </Alert>
            )}

            {/* Onchain Caveat Enforcement & Compliance Note */}
            <Alert className="border-border/80 bg-muted/40 py-2.5">
              <ShieldCheck className="h-4 w-4 text-foreground" />
              <AlertTitle className="text-xs font-semibold text-foreground">Enforced Onchain Caveats</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Payments are cryptographically restricted by your company&apos;s onchain caveats (per-transaction caps, period allowances, and recipient restrictions). Any transfer exceeding these limits reverts automatically on Monad. Receipt upload is optional for automated AI compliance verification.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="ds-to" className="text-xs font-medium">Recipient Address</Label>
              <Input
                id="ds-to"
                placeholder="0x..."
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                className="font-mono text-xs"
                disabled={isExecuting}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="ds-amount" className="text-xs font-medium">Amount ({TOKEN_SYMBOL})</Label>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Available: {remainingBalanceEth} {TOKEN_SYMBOL}
                </span>
              </div>
              <Input
                id="ds-amount"
                type="number"
                step="0.0001"
                placeholder="0.00"
                value={amountEth}
                onChange={(e) => setAmountEth(e.target.value)}
                disabled={isExecuting}
                className="font-mono text-xs"
              />
            </div>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
              <Button
                onClick={handleStartExecute}
                disabled={!toAddress || !amountEth || isExecuting}
                className="w-full mt-2 text-xs"
              >
                {isExecuting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                {isExecuting ? "Executing on Monad..." : "Execute Spend"}
              </Button>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Direct Spend</AlertDialogTitle>
                  <AlertDialogDescription className="text-xs leading-relaxed">
                    You are authorizing a payout of <strong className="text-foreground">{amountEth} {TOKEN_SYMBOL}</strong> to{" "}
                    <strong className="break-all font-mono text-[11px] text-foreground">{toAddress}</strong> on Monad Testnet.
                    <br /><br />
                    This transaction executes directly from the company's delegated balance and is irreversible. On-chain caveats and per-transaction limits apply.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isExecuting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleExecute}
                    disabled={isExecuting}
                    className="text-xs"
                  >
                    {isExecuting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    Confirm & Execute
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {step === "receipt" && (
          <div className="space-y-5">
            {error && (
              <Alert className="border-destructive/60 bg-destructive/10 text-destructive py-2.5">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">Error</AlertTitle>
                <AlertDescription className="text-xs mt-0.5">{error}</AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg border border-border/80 bg-muted/30 p-3.5 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-sans">Recipient:</span>
                <span className="font-semibold text-foreground">{toAddress.slice(0, 8)}...{toAddress.slice(-6)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-sans">Settled Amount:</span>
                <span className="font-semibold text-foreground">{amountEth} {TOKEN_SYMBOL}</span>
              </div>
              {txHash && (
                <div className="flex justify-between items-center pt-2 border-t border-border/60">
                  <span className="text-muted-foreground font-sans">Monad Tx:</span>
                  <a
                    href={getTxExplorerUrl(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline hover:opacity-80"
                  >
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </a>
                </div>
              )}
            </div>

            <div className="border border-dashed border-border rounded-lg p-5 text-center bg-muted/15">
              <div className="mx-auto bg-background rounded-full h-10 w-10 flex items-center justify-center mb-2.5 shadow-2xs border border-border">
                <UploadCloud className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-xs font-semibold text-foreground mb-1">Attach Receipt (Optional)</h3>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto mb-3.5 leading-relaxed">
                Attach an invoice or receipt image for automated AI compliance verification. Unverified transactions will remain logged and subject to employer audit.
              </p>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="max-w-xs mx-auto mb-3 text-xs cursor-pointer"
                disabled={isSubmittingReceipt}
              />
              {receiptImage && (
                <Button
                  onClick={handleSubmitReceipt}
                  className="w-full max-w-xs text-xs"
                  disabled={isSubmittingReceipt}
                >
                  {isSubmittingReceipt ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                  {isSubmittingReceipt ? "Verifying with AI..." : "Verify Receipt with AI"}
                </Button>
              )}
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("done")}
                  className="text-xs text-muted-foreground"
                  disabled={isSubmittingReceipt}
                >
                  Skip receipt upload
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-6 space-y-5 text-center">
            {verificationResult && (
              <Alert className="border-border/80 bg-muted/30 text-left py-2.5">
                {verificationResult.verified ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <AlertTitle className="text-xs font-semibold">
                  {verificationResult.verified ? "Receipt Verified Compliant" : "Flagged for Employer Review"}
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground mt-0.5">
                  {verificationResult.reasoning}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center border border-border/80">
              <CheckCircle2 className="h-6 w-6 text-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">Spend Logged Successfully</h2>
              <p className="text-xs text-muted-foreground">The transaction has been broadcast and added to your company's ledger.</p>
            </div>
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => {
                setToAddress("");
                setAmountEth("");
                setTxHash(null);
                setReceiptImage(null);
                setVerificationResult(null);
                setStep("input");
              }}
            >
              New Spend
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
