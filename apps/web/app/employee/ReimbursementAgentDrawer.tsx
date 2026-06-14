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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LoaderCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ScanIcon,
  SendIcon,
  SparklesIcon,
  StoreIcon,
  CalendarIcon,
  DollarSignIcon,
  CoinsIcon,
  BotIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { toast } from "sonner";

type ExtractionResult = {
  merchant: string;
  date: string;
  totalUsd: string;
  estimatedEth: string;
  suggestedPurpose: string;
  lineItems: string[];
  confidence: number;
};

type DrawerStep = "upload" | "extracting" | "review" | "submitting" | "success" | "error";

export function ReimbursementAgentDrawer({
  isOpen,
  onOpenChange,
  companyId,
  employeeId,
  agentId,
  isEmployerActivated,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  employeeId: string;
  agentId: string;
  isEmployerActivated: boolean;
}) {
  const [step, setStep] = useState<DrawerStep>("upload");
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);

  // Editable review fields
  const [reviewPurpose, setReviewPurpose] = useState("");
  const [reviewAmountEth, setReviewAmountEth] = useState("");

  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset when drawer closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setStep("upload");
        setFileBase64(null);
        setExtraction(null);
        setReviewPurpose("");
        setReviewAmountEth("");
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
    reader.onload = () => setFileBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleLoadSample = async () => {
    try {
      const res = await fetch("/sample-receipt.jpg");
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        setFileBase64(reader.result as string);
        toast.success("Sample receipt loaded!");
      };
      reader.readAsDataURL(blob);
    } catch {
      toast.error("Failed to load sample receipt");
    }
  };

  const handleExtract = async () => {
    if (!fileBase64) return;
    setStep("extracting");
    try {
      const res = await fetch("/api/agents/reimbursement/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptBase64: fileBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setExtraction(data.extraction);
      setReviewPurpose(data.extraction.suggestedPurpose);
      setReviewAmountEth(data.extraction.estimatedEth);
      setStep("review");
    } catch (err: any) {
      setErrorMessage(err.message);
      setStep("error");
    }
  };

  const handleSubmit = async () => {
    if (!fileBase64 || !reviewPurpose || !reviewAmountEth) return;
    setStep("submitting");
    try {
      const res = await fetch("/api/agents/reimbursement/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimDescription: reviewPurpose,
          amountEth: reviewAmountEth,
          receiptBase64: fileBase64,
          companyId,
          employeeId,
          agentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "An error occurred");
        setStep("error");
        return;
      }
      if (data.veniceApproved) {
        setTxHash(data.txHash || null);
        setResultMessage(data.veniceReasoning || "Claim approved by AI.");
        setStep("success");
        toast.success("Claim approved and reimbursed!");
      } else {
        setErrorMessage(`Rejected: ${data.veniceReasoning}`);
        setStep("error");
        toast.error("Claim was rejected by the agent");
      }
    } catch (err: any) {
      setErrorMessage(err.message);
      setStep("error");
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <BotIcon className="w-5 h-5 text-primary" />
            Reimbursement Agent
          </DrawerTitle>
          <DrawerDescription>
            Snap a photo of your receipt. The AI will extract the details and
            evaluate them against company policy.
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 flex flex-col gap-4 max-w-lg mx-auto w-full overflow-y-auto max-h-[65vh] mb-4">
          {/* ── STEP 0: Blocked / Not Activated ──────────────────────────── */}
          {!isEmployerActivated && (
            <div className="bg-muted/30 text-foreground p-6 rounded-md text-sm flex flex-col gap-3 items-center text-center border border-border mt-4">
              <ShieldCheckIcon className="w-12 h-12 text-muted-foreground mb-1" />
              <h3 className="font-semibold text-lg">Agent Not Configured</h3>
              <p className="text-muted-foreground leading-relaxed max-w-sm">
                Your employer has not activated the Reimbursement Agent yet. Please ask your employer to configure and delegate funds to this agent in their dashboard before you can use it.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}

          {/* ── STEP 1: Upload ────────────────────────────────────────────── */}
          {step === "upload" && isEmployerActivated && (
            <div className="flex flex-col gap-4">
              {!fileBase64 ? (
                <div className="flex flex-col gap-3">
                  <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 bg-muted/20 hover:bg-muted/30 transition-colors">
                    <ScanIcon className="w-10 h-10 text-muted-foreground/50" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Upload your receipt</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG, or WEBP · No PDFs</p>
                    </div>
                    <Label htmlFor="receipt-upload" className="cursor-pointer">
                      <Button variant="outline" size="sm" className="pointer-events-none">
                        Choose Image
                      </Button>
                      <Input
                        id="receipt-upload"
                        type="file"
                        accept="image/jpeg, image/png, image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </Label>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium self-start transition-colors"
                    onClick={handleLoadSample}
                  >
                    <SparklesIcon className="w-3.5 h-3.5 mr-1.5" />
                    Testing? Use sample receipt
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="rounded-lg border bg-muted/20 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground">Receipt Preview</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                        onClick={() => setFileBase64(null)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="bg-white p-3 flex items-center justify-center">
                      <img src={fileBase64} alt="Receipt" className="max-h-64 object-contain rounded" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Looks good? Click below and the AI will extract all the details.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Extracting ───────────────────────────────────────── */}
          {step === "extracting" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-muted-foreground">
              <div className="relative">
                <ScanIcon className="w-12 h-12 text-primary/30" />
              </div>
              <div className="text-center flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <LoaderCircleIcon className="w-4 h-4 animate-spin text-primary" />
                  <p className="font-medium text-foreground">Analyzing receipt...</p>
                </div>
                <p className="text-xs mt-1">Venice AI Vision is extracting details</p>
              </div>
            </div>
          )}

          {/* ── STEP 3: Review ───────────────────────────────────────────── */}
          {step === "review" && extraction && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border bg-muted/10 p-3 flex flex-col gap-2 text-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Extracted from Receipt</p>
                <div className="flex items-center gap-2">
                  <StoreIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium">{extraction.merchant}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>{extraction.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSignIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>${extraction.totalUsd} USD</span>
                </div>
                {extraction.lineItems?.length > 0 && (
                  <ul className="ml-5 mt-1 text-xs text-muted-foreground list-disc space-y-0.5">
                    {extraction.lineItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="review-purpose">Expense Description</Label>
                <Textarea
                  id="review-purpose"
                  value={reviewPurpose}
                  onChange={(e) => setReviewPurpose(e.target.value)}
                  rows={2}
                  disabled={step !== "review"}
                />
                <p className="text-[10px] text-muted-foreground">You can edit this before submitting.</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="review-amount" className="flex items-center gap-1.5">
                  <CoinsIcon className="w-3.5 h-3.5" />
                  Amount (ETH)
                </Label>
                <Input
                  id="review-amount"
                  type="number"
                  step="0.000001"
                  value={reviewAmountEth}
                  onChange={(e) => setReviewAmountEth(e.target.value)}
                  disabled={step !== "review"}
                />
                <p className="text-[10px] text-muted-foreground">Estimated from ${extraction.totalUsd} USD at 1 ETH = $3,000.</p>
              </div>
            </div>
          )}

          {/* ── STEP: Submitting ─────────────────────────────────────────── */}
          {step === "submitting" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-muted-foreground">
              <LoaderCircleIcon className="w-10 h-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium text-foreground">Agent is reviewing your claim...</p>
                <p className="text-xs mt-1">Checking policy compliance and sending on-chain</p>
              </div>
            </div>
          )}

          {/* ── STEP: Success ────────────────────────────────────────────── */}
          {step === "success" && (
            <div className="bg-muted/30 text-foreground p-6 rounded-md text-sm flex flex-col gap-3 items-center text-center border border-border">
              <CheckCircleIcon className="w-12 h-12 text-primary mb-1" />
              <h3 className="font-semibold text-lg">Reimbursement Successful</h3>
              <p className="text-muted-foreground leading-relaxed max-w-sm">
                {resultMessage}
                <br /><br />
                The funds have been transferred directly to your smart account.
              </p>

              {txHash && (
                <div className="mt-4 w-full p-3 bg-card rounded-md border border-border text-xs text-left break-all shadow-sm">
                  <span className="font-semibold text-foreground block mb-1">Transaction Hash:</span>
                  <a
                    href={`https://sepolia.basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-mono"
                  >
                    {txHash}
                  </a>
                </div>
              )}

              <Button variant="outline" className="mt-4" onClick={() => onOpenChange(false)}>
                Close Window
              </Button>
            </div>
          )}

          {/* ── STEP: Error ──────────────────────────────────────────────── */}
          {step === "error" && (
            <div className="bg-muted/30 text-foreground p-6 rounded-md text-sm flex flex-col gap-3 items-center text-center border border-border">
              <XCircleIcon className="w-12 h-12 text-muted-foreground mb-1" />
              <h3 className="font-semibold text-lg">Claim Rejected</h3>
              <p className="text-muted-foreground leading-relaxed max-w-sm">
                {errorMessage}
              </p>
              <Button variant="outline" className="mt-4" onClick={() => { setStep("upload"); setErrorMessage(null); setFileBase64(null); }}>
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* ── Footer Buttons ───────────────────────────────────────────── */}
        {isEmployerActivated && (
          <DrawerFooter className="border-t pt-4">
            {step === "upload" && (
              <Button onClick={handleExtract} disabled={!fileBase64}>
                <ScanIcon className="w-4 h-4 mr-2" />
                Scan Receipt with AI
              </Button>
            )}
            {step === "review" && (
              <Button onClick={handleSubmit} disabled={!reviewPurpose || !reviewAmountEth}>
                <SendIcon className="w-4 h-4 mr-2" />
                Submit Claim
              </Button>
            )}
            {step === "error" && (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            )}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
