"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
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
  onExecute: (details: { toAddress: string; amountEth: string; purpose: string; isFlagged: boolean }) => Promise<string>;
  onVerifyReceipt: (txHash: string, imageBase64: string) => Promise<void>;
};

export function DirectSpendForm({ delegationId, onExecute, onVerifyReceipt }: Props) {
  const [step, setStep] = useState<"input" | "evaluating" | "review" | "executing" | "receipt" | "done">("input");
  
  const [toAddress, setToAddress] = useState("");
  const [amountEth, setAmountEth] = useState("");
  const [purpose, setPurpose] = useState("");
  
  const [isFlagged, setIsFlagged] = useState(false);
  const [reasoning, setReasoning] = useState("");
  
  const [txHash, setTxHash] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  const handleEvaluate = async () => {
    if (!toAddress || !amountEth || !purpose) return;
    try {
      parseEther(amountEth);
    } catch {
      alert("Invalid ETH amount");
      return;
    }

    setStep("evaluating");
    
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
        alert(data.error || "Evaluation failed");
        setStep("input");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to evaluate policy");
      setStep("input");
    }
  };

  const handleExecute = async () => {
    setStep("executing");
    try {
      const hash = await onExecute({ toAddress, amountEth, purpose, isFlagged });
      setTxHash(hash);
      setStep("receipt");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Execution failed");
      setStep("review");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setReceiptImage(result); // Will include data URI prefix
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReceipt = async () => {
    if (!txHash || !receiptImage) return;
    setStep("done"); // optimistic
    try {
      await onVerifyReceipt(txHash, receiptImage);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col space-y-6 max-w-lg">
      {step === "input" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>To Address</Label>
            <Input placeholder="0x..." value={toAddress} onChange={(e) => setToAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Amount (ETH)</Label>
            <Input placeholder="0.01" value={amountEth} onChange={(e) => setAmountEth(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Purpose</Label>
            <Input placeholder="e.g. Client dinner at Dorsia" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
          <Button onClick={handleEvaluate} disabled={!toAddress || !amountEth || !purpose} className="w-full">
            Review Spend
          </Button>
        </div>
      )}

      {step === "evaluating" && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Venice AI evaluating policy...</p>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-6">
          <div className="space-y-2 text-sm">
            <p><strong>To:</strong> {toAddress}</p>
            <p><strong>Amount:</strong> {amountEth} ETH</p>
            <p><strong>Purpose:</strong> {purpose}</p>
          </div>
          
          <Alert variant={isFlagged ? "destructive" : "default"} className={!isFlagged ? "border-green-500/50 bg-green-500/10 text-green-600" : ""}>
            {isFlagged ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
            <AlertTitle>{isFlagged ? "Policy Violation Flagged" : "Compliant with Policy"}</AlertTitle>
            <AlertDescription className="mt-2 text-sm">
              {reasoning}
              {isFlagged && <div className="mt-2 font-semibold">You may proceed, but this transaction will be flagged for employer review.</div>}
            </AlertDescription>
          </Alert>

          <div className="flex space-x-4">
            <Button variant="outline" onClick={() => setStep("input")} className="flex-1">Back</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="flex-1" variant={isFlagged ? "destructive" : "default"}>
                  Execute Spend
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Direct Spend</AlertDialogTitle>
                  <AlertDialogDescription>
                    You are about to send <strong>{amountEth} ETH</strong> to <strong className="break-all">{toAddress}</strong>.
                    This is an irreversible on-chain transaction.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleExecute}
                    className={isFlagged ? "bg-red-600 text-white hover:bg-red-700" : ""}
                  >
                    Yes, execute spend
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {step === "executing" && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Executing on-chain via Bundler...</p>
        </div>
      )}

      {step === "receipt" && (
        <div className="space-y-6">
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">Transaction Successful</AlertTitle>
            <AlertDescription className="text-green-600">
              Tx Hash: <span className="font-mono text-xs">{txHash}</span>
            </AlertDescription>
          </Alert>

          <div className="space-y-4 border rounded-lg p-6 text-center border-dashed">
            <div className="mx-auto bg-muted/50 rounded-full h-12 w-12 flex items-center justify-center mb-4">
              <UploadCloud className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold">Upload Receipt (Optional)</h3>
            <p className="text-xs text-muted-foreground">
              Provide a receipt for Venice AI to verify against your stated purpose.
            </p>
            <Input type="file" accept="image/*" onChange={handleFileUpload} className="max-w-xs mx-auto" />
            {receiptImage && (
              <Button onClick={handleSubmitReceipt} className="mt-4">
                Submit Receipt
              </Button>
            )}
            <div className="mt-4">
              <Button variant="link" onClick={() => setStep("done")} className="text-xs">
                Skip for now
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <h2 className="text-xl font-semibold">All Done!</h2>
          <p className="text-sm text-muted-foreground">Your transaction and receipt have been logged.</p>
          <Button onClick={() => {
            setToAddress(""); setAmountEth(""); setPurpose(""); setTxHash(null); setReceiptImage(null); setStep("input");
          }}>
            New Spend
          </Button>
        </div>
      )}
    </div>
  );
}
