"use client";

import { useState } from "react";
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
import { LoaderCircleIcon, CheckCircleIcon, XCircleIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

export function ReimbursementAgentDrawer({
  isOpen,
  onOpenChange,
  companyId,
  employeeId,
  agentId,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  employeeId: string;
  agentId: string;
}) {
  const [claimDescription, setClaimDescription] = useState("");
  const [amountEth, setAmountEth] = useState("");
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  
  const [status, setStatus] = useState<"idle" | "submitting" | "thinking" | "executing" | "success" | "error">("idle");
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!claimDescription || !amountEth) {
      toast.error("Description and amount are required");
      return;
    }

    try {
      setStatus("submitting");
      setResultMessage(null);

      const res = await fetch("/api/agents/reimbursement/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimDescription,
          amountEth,
          receiptBase64: fileBase64,
          companyId,
          employeeId,
          agentId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setResultMessage(data.error || "An error occurred");
        return;
      }

      if (data.veniceApproved) {
        setStatus("success");
        setResultMessage(`Approved: ${data.veniceReasoning}`);
        toast.success("Claim approved and reimbursed!");
      } else {
        setStatus("error");
        setResultMessage(`Rejected: ${data.veniceReasoning}`);
        toast.error("Claim was rejected by the agent");
      }
    } catch (err: any) {
      setStatus("error");
      setResultMessage(err.message);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Submit Reimbursement Claim</DrawerTitle>
          <DrawerDescription>
            The Reimbursement AI Agent will review your claim against the company policy.
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 flex flex-col gap-4 max-w-lg mx-auto w-full">
          {status === "idle" || status === "error" || status === "submitting" ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">What was the expense?</Label>
                <Textarea
                  id="description"
                  value={claimDescription}
                  onChange={(e) => setClaimDescription(e.target.value)}
                  placeholder="e.g. Lunch with client at Italian restaurant"
                  disabled={status === "submitting"}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="amount">Amount (ETH)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.0001"
                  value={amountEth}
                  onChange={(e) => setAmountEth(e.target.value)}
                  placeholder="0.05"
                  disabled={status === "submitting"}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="receipt">Receipt (Optional)</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={status === "submitting"}
                />
              </div>

              {status === "error" && resultMessage && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm flex gap-2">
                  <XCircleIcon className="w-5 h-5 shrink-0" />
                  <p>{resultMessage}</p>
                </div>
              )}
            </>
          ) : status === "success" ? (
            <div className="bg-green-500/10 text-green-600 p-4 rounded-md text-sm flex flex-col gap-2 items-center text-center">
              <CheckCircleIcon className="w-8 h-8" />
              <p className="font-semibold text-base">Claim Approved & Reimbursed</p>
              <p>{resultMessage}</p>
              <Button variant="outline" className="mt-4" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 gap-4 text-muted-foreground">
              <LoaderCircleIcon className="w-8 h-8 animate-spin" />
              <p className="animate-pulse">
                Agent is reviewing your claim...
              </p>
            </div>
          )}
        </div>

        {(status === "idle" || status === "error" || status === "submitting") && (
          <DrawerFooter className="border-t pt-4">
            <Button onClick={handleSubmit} disabled={status === "submitting"}>
              {status === "submitting" ? (
                <LoaderCircleIcon className="animate-spin w-4 h-4 mr-2" />
              ) : (
                <UploadIcon className="w-4 h-4 mr-2" />
              )}
              Submit Claim
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
