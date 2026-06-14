"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Loader2, UploadCloud, ArrowRight } from "lucide-react";
import { parseEther } from "viem";
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

type Props = {
  delegationId: string;
  remainingBalanceEth: string;
  onExecute: (details: { toAddress: string; amountEth: string; purpose: string; isFlagged: boolean }) => Promise<string>;
  onVerifyReceipt: (txHash: string, imageBase64: string) => Promise<void>;
};

export function DirectSpendForm({ delegationId, remainingBalanceEth, onExecute, onVerifyReceipt }: Props) {
  const [step, setStep] = useState<"input" | "review" | "receipt" | "done">("input");
  
  const [toAddress, setToAddress] = useState("");
  const [amountEth, setAmountEth] = useState("");
  const [purpose, setPurpose] = useState("");
  
  const [isFlagged, setIsFlagged] = useState(false);
  const [reasoning, setReasoning] = useState("");
  
  const [txHash, setTxHash] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);

  const handleEvaluate = async () => {
    const trimmedToAddress = toAddress.trim();
    const trimmedPurpose = purpose.trim();
    
    if (!trimmedToAddress || !amountEth || !trimmedPurpose) {
      setError("Please fill in all fields.");
      return;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedToAddress)) {
      setError("Invalid recipient address.");
      return;
    }
    
    let parsedAmount;
    try {
      parsedAmount = parseEther(amountEth);
    } catch {
      setError("Invalid ETH amount");
      return;
    }

    try {
      const remaining = parseEther(remainingBalanceEth);
      if (parsedAmount > remaining) {
        setError("Insufficient delegated balance.");
        return;
      }
    } catch {
      // Ignore if parsing fails
    }

    setError(null);
    setIsEvaluating(true);
    
    try {
      const res = await fetch("/api/wallet/policy-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, amountEth, delegationId }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setIsFlagged(!data.isCompliant);
        setReasoning(data.reasoning);
        setStep("review");
      } else {
        setError(data.error || "Evaluation failed");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to evaluate policy");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleExecute = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsExecuting(true);
    setError(null);
    try {
      const hash = await onExecute({ toAddress, amountEth, purpose, isFlagged });
      setTxHash(hash);
      setStep("receipt");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Execution failed");
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
      await onVerifyReceipt(txHash, receiptImage);
      setStep("done");
    } catch (err) {
      console.error(err);
      setError("Failed to verify receipt");
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-sm border-border">
      <CardHeader>
        <CardTitle>Unallocated Balance Spend</CardTitle>
        <CardDescription>
          Spend funds from your remaining delegated balance. Your intended purpose will be verified against the company policy by Venice AI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "input" && (
          <div className="space-y-4">
            {error && (
              <Alert className="border-foreground">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="ds-to">To Address</Label>
              <Input
                id="ds-to"
                placeholder="0x..."
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                className="font-mono text-sm"
                disabled={isEvaluating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-amount">Amount (ETH)</Label>
              <Input
                id="ds-amount"
                type="number"
                step="0.0001"
                placeholder="0.01"
                value={amountEth}
                onChange={(e) => setAmountEth(e.target.value)}
                disabled={isEvaluating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-purpose">Purpose</Label>
              <Input
                id="ds-purpose"
                placeholder="e.g. Client dinner at Dorsia"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={isEvaluating}
              />
            </div>
            <Button
              onClick={handleEvaluate}
              disabled={!toAddress || !amountEth || !purpose || isEvaluating}
              className="w-full mt-4"
            >
              {isEvaluating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEvaluating ? "Evaluating..." : "Review Spend"}
              {!isEvaluating && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-6">
            {error && (
              <Alert className="border-foreground">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="rounded-md bg-muted p-4 space-y-2 text-sm border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">To:</span>
                <span className="font-mono">{toAddress.slice(0, 6)}...{toAddress.slice(-4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold">{amountEth} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Purpose:</span>
                <span className="text-right max-w-[200px] truncate" title={purpose}>{purpose}</span>
              </div>
            </div>
            
            <Alert className={isFlagged ? "border-foreground" : "border-border"}>
              {isFlagged ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              <AlertTitle>{isFlagged ? "Policy Violation Flagged" : "Compliant with Policy"}</AlertTitle>
              <AlertDescription className="mt-2 text-sm leading-relaxed">
                {reasoning}
                {isFlagged && <div className="mt-3 font-semibold text-foreground">You may proceed, but this transaction will be flagged for employer review.</div>}
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("input")} className="flex-1" disabled={isExecuting}>
                Back
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="flex-1" disabled={isExecuting}>
                    {isExecuting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isExecuting ? "Executing..." : "Execute Spend"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Direct Spend</AlertDialogTitle>
                    <AlertDialogDescription>
                      You are about to send <strong className="text-foreground">{amountEth} ETH</strong> to <strong className="break-all font-mono text-xs text-foreground">{toAddress}</strong>.
                      This is an irreversible on-chain transaction.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleExecute}>
                      Yes, execute spend
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {step === "receipt" && (
          <div className="space-y-6">
            {error && (
              <Alert className="border-foreground">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Alert className="border-border">
              <CheckCircle2 className="h-4 w-4 text-foreground" />
              <AlertTitle>Transaction Successful</AlertTitle>
              <AlertDescription className="text-muted-foreground font-mono text-xs break-all mt-1">
                Tx Hash: {txHash}
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg p-6 text-center border-dashed bg-muted/20">
              <div className="mx-auto bg-background rounded-full h-12 w-12 flex items-center justify-center mb-4 shadow-sm border border-border">
                <UploadCloud className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium mb-1">Upload Receipt (Optional)</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Provide a receipt for Venice AI to verify against your stated purpose.
              </p>
              <Input type="file" accept="image/*" onChange={handleFileUpload} className="max-w-xs mx-auto mb-4" disabled={isSubmittingReceipt} />
              {receiptImage && (
                <Button onClick={handleSubmitReceipt} className="w-full max-w-xs" disabled={isSubmittingReceipt}>
                  {isSubmittingReceipt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSubmittingReceipt ? "Submitting..." : "Submit Receipt"}
                </Button>
              )}
              <div className="mt-4">
                <Button variant="ghost" size="sm" onClick={() => setStep("done")} className="text-xs text-muted-foreground" disabled={isSubmittingReceipt}>
                  Skip for now
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border border-border">
              <CheckCircle2 className="h-8 w-8 text-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">All Done!</h2>
              <p className="text-sm text-muted-foreground">Your transaction and receipt have been logged.</p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setToAddress("");
                setAmountEth("");
                setPurpose("");
                setTxHash(null);
                setReceiptImage(null);
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
