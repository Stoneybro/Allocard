"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react";
import { parseEther } from "viem";

type Props = {
  availableBalanceEth: string;
  onExecute: (details: { toAddress: string; amountEth: string }) => Promise<string>;
};

export function SmartAccountSpendForm({ availableBalanceEth, onExecute }: Props) {
  const [step, setStep] = useState<"input" | "done">("input");
  const [toAddress, setToAddress] = useState("");
  const [amountEth, setAmountEth] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    const trimmedToAddress = toAddress.trim();
    
    if (!trimmedToAddress || !amountEth) {
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
      const available = parseEther(availableBalanceEth);
      if (parsedAmount > available) {
        setError("Insufficient smart account balance.");
        return;
      }
    } catch {
      // If availableBalanceEth fails to parse, we'll just let it pass or show an error
    }

    setError(null);
    setIsExecuting(true);
    try {
      const hash = await onExecute({ toAddress, amountEth });
      setTxHash(hash);
      setStep("done");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Execution failed");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-sm border-border">
      <CardHeader>
        <CardTitle>Direct Smart Account Spend</CardTitle>
        <CardDescription>
          Send funds directly from your smart account. This action is unrestricted and executes entirely on-chain.
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
              <Label htmlFor="sa-to">To Address</Label>
              <Input
                id="sa-to"
                placeholder="0x..."
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                className="font-mono text-sm"
                disabled={isExecuting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sa-amount">Amount (ETH)</Label>
              <Input
                id="sa-amount"
                type="number"
                step="0.0001"
                placeholder="0.01"
                value={amountEth}
                onChange={(e) => setAmountEth(e.target.value)}
                disabled={isExecuting}
              />
            </div>
            <Button
              onClick={handleExecute}
              disabled={!toAddress || !amountEth || isExecuting}
              className="w-full mt-4"
            >
              {isExecuting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {isExecuting ? "Executing..." : "Send Transaction"}
            </Button>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border border-border">
              <CheckCircle2 className="h-8 w-8 text-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Transaction Sent</h2>
              <p className="text-sm text-muted-foreground">Your transaction has been successfully executed.</p>
            </div>
            
            <Alert className="text-left border-border">
              <CheckCircle2 className="h-4 w-4 text-foreground" />
              <AlertTitle>Transaction Hash</AlertTitle>
              <AlertDescription className="font-mono text-xs break-all mt-1 text-muted-foreground">
                {txHash}
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setToAddress("");
                setAmountEth("");
                setTxHash(null);
                setStep("input");
              }}
            >
              Send Another
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
