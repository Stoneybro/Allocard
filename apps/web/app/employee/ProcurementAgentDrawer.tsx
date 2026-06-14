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
import { LoaderCircleIcon, CheckCircleIcon, XCircleIcon, ShoppingCartIcon } from "lucide-react";
import { toast } from "sonner";

export function ProcurementAgentDrawer({
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
  const [toolCategory, setToolCategory] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [additionalRequirements, setAdditionalRequirements] = useState("");
  
  const [status, setStatus] = useState<"idle" | "researching" | "proposed" | "booking" | "success" | "error">("idle");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [vendorChoice, setVendorChoice] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setToolCategory("");
        setTeamSize("");
        setAdditionalRequirements("");
        setStatus("idle");
        setResultMessage(null);
        setTxHash(null);
        setVendorChoice(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleResearch = async () => {
    if (!toolCategory || !teamSize) {
      toast.error("Tool category and team size are required");
      return;
    }

    try {
      setStatus("researching");
      setResultMessage(null);

      const res = await fetch("/api/agents/procurement/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolCategory,
          teamSize: parseInt(teamSize, 10),
          additionalRequirements,
          delegationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setResultMessage(data.error || "An error occurred during research");
        return;
      }

      setVendorChoice(data.choice);
      setStatus("proposed");
    } catch (err: any) {
      setStatus("error");
      setResultMessage(err.message);
    }
  };

  const handleBook = async () => {
    try {
      setStatus("booking");
      setResultMessage(null);

      const res = await fetch("/api/agents/procurement/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorChoice,
          delegationId,
          agentId,
          employeeId: employee.id,
          companyId: company.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setResultMessage(data.error || "An error occurred during booking");
        return;
      }

      setStatus("success");
      setTxHash(data.txHash);
      toast.success("Subscription procured successfully!");
    } catch (err: any) {
      setStatus("error");
      setResultMessage(err.message);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-center sm:text-center">
          <DrawerTitle className="text-center">Procurement Agent</DrawerTitle>
          <DrawerDescription>
            Request software subscriptions. The AI will find the best vendor and check for duplicate tools.
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 flex flex-col gap-4 max-w-lg mx-auto w-full">
          {status === "idle" || status === "error" || status === "researching" ? (
            <>
              <div className="flex gap-4">
                <div className="flex flex-col gap-2 flex-1">
                  <Label htmlFor="category">Tool Category</Label>
                  <Input
                    id="category"
                    value={toolCategory}
                    onChange={(e) => setToolCategory(e.target.value)}
                    placeholder="e.g. CRM, Design, Analytics"
                    disabled={status === "researching"}
                  />
                </div>
                <div className="flex flex-col gap-2 w-32">
                  <Label htmlFor="teamSize">Team Size</Label>
                  <Input
                    id="teamSize"
                    type="number"
                    min="1"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    placeholder="e.g. 5"
                    disabled={status === "researching"}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="requirements">Additional Requirements</Label>
                <Textarea
                  id="requirements"
                  value={additionalRequirements}
                  onChange={(e) => setAdditionalRequirements(e.target.value)}
                  placeholder="e.g. Needs SSO and API access"
                  disabled={status === "researching"}
                />
              </div>

              {status === "error" && resultMessage && (
                <div className="bg-muted/50 border p-3 rounded-md text-sm flex gap-2">
                  <XCircleIcon className="w-5 h-5 shrink-0 text-muted-foreground" />
                  <p className="text-foreground">{resultMessage}</p>
                </div>
              )}
            </>
          ) : (status === "proposed" || status === "booking") && vendorChoice ? (
            <div className="flex flex-col gap-4 bg-muted/50 p-4 rounded-md border">
              <h3 className="font-semibold text-lg border-b pb-2">Proposed Subscription</h3>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-start">
                  <p className="font-medium text-sm text-muted-foreground">Vendor</p>
                  <p className="font-semibold">{vendorChoice.selectedVendor}</p>
                </div>
                <div className="flex justify-between items-start">
                  <p className="font-medium text-sm text-muted-foreground">Plan</p>
                  <p className="font-semibold">{vendorChoice.selectedPlan}</p>
                </div>
              </div>
              <div className="border-t pt-2 mt-2">
                <p className="text-sm text-muted-foreground">Agent Reasoning</p>
                <p className="text-sm italic">{vendorChoice.reasoning}</p>
              </div>
              <div className="flex justify-between items-center border-t pt-4">
                <p className="font-semibold text-muted-foreground">Estimated Monthly Cost</p>
                <p className="font-bold text-lg">{vendorChoice.estimatedCostEth} ETH</p>
              </div>
            </div>
          ) : status === "success" ? (
            <div className="bg-muted/30 text-foreground p-6 rounded-md text-sm flex flex-col gap-3 items-center text-center border border-border">
              <CheckCircleIcon className="w-12 h-12 text-primary mb-1" />
              <p className="font-semibold text-lg">Transaction Successful</p>
              <p className="text-muted-foreground leading-relaxed max-w-sm">
                The operation was successful. Since live vendor purchasing is currently simulated, the redelegated funds have been securely routed to your smart account and deducted from the company's master card balance.
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
              <Button variant="outline" className="mt-4 w-full" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 gap-4 text-muted-foreground">
              <LoaderCircleIcon className="w-8 h-8 animate-spin" />
              <p className="animate-pulse">
                {status === "booking" ? "Executing transaction..." : "Agent is researching vendors..."}
              </p>
            </div>
          )}
        </div>

        {(status === "idle" || status === "error" || status === "researching") && (
          <DrawerFooter className="border-t pt-4 max-w-lg mx-auto w-full">
            <Button onClick={handleResearch} disabled={status === "researching"}>
              {status === "researching" ? (
                <LoaderCircleIcon className="animate-spin w-4 h-4 mr-2" />
              ) : (
                <ShoppingCartIcon className="w-4 h-4 mr-2" />
              )}
              Research Vendor
            </Button>
          </DrawerFooter>
        )}

        {(status === "proposed" || status === "booking") && (
          <DrawerFooter className="border-t pt-4 flex-row gap-2 max-w-lg mx-auto w-full">
            <Button variant="outline" className="flex-1" onClick={() => setStatus("idle")} disabled={status === "booking"}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleBook} disabled={status === "booking"}>
              {status === "booking" ? (
                <LoaderCircleIcon className="animate-spin w-4 h-4 mr-2" />
              ) : (
                <CheckCircleIcon className="w-4 h-4 mr-2" />
              )}
              Subscribe & Pay
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
