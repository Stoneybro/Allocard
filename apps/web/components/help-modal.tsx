import { HelpCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function HelpModal() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <HelpCircleIcon className="size-4" />
          <span className="hidden sm:inline-block">Help & Demo Tips</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto sm:p-8">
        <SheetHeader className="mb-8">
          <SheetTitle className="text-2xl font-bold tracking-tight">How to use Allocard</SheetTitle>
          <SheetDescription className="text-sm">
            A quick walkthrough of the employer and employee flows, and tips for demoing the app.
          </SheetDescription>
        </SheetHeader>

        <div className="text-sm text-foreground/90 pb-8 px-2">
          
          <div className="mb-8 p-4 rounded-lg border border-border bg-muted/40">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">!</span>
              Demo Tip: Testing Both Roles
            </h3>
            <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
              MetaMask stores sessions in browser local storage. To run employer and employee accounts simultaneously without sharing a wallet, use separate contexts:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm mb-1">
              <li><strong>Easiest:</strong> Normal window for employer, Incognito window for employee.</li>
              <li><strong>Alternative:</strong> Two different Chrome profiles or browsers.</li>
            </ul>
          </div>

          <Accordion type="single" collapsible className="w-full" defaultValue="step-1">
            <AccordionItem value="step-1">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">1. Setup & Onboarding</AccordionTrigger>
              <AccordionContent className="text-muted-foreground pt-2 pb-4">
                <ol className="list-decimal pl-5 space-y-2.5">
                  <li><strong>Employer:</strong> Create a company and activate the master smart account.</li>
                  <li><strong>Employer:</strong> Generate an invite link from the sidebar and copy it.</li>
                  <li><strong>Employee:</strong> Open the invite link in an Incognito window and connect a different wallet.</li>
                  <li><strong>Employee:</strong> Activate the employee smart account from the dashboard banner.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-2">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">2. Employer: Issue a Delegation</AccordionTrigger>
              <AccordionContent className="text-muted-foreground pt-2 pb-4">
                <ol className="list-decimal pl-5 space-y-2.5">
                  <li>Switch to the employer window. The employee now appears in the sidebar.</li>
                  <li>Drag the employee from the sidebar onto the canvas.</li>
                  <li>Click <strong>Configure</strong> on the pending node.</li>
                  <li>Set the spending limits (e.g., 0.1 ETH) and click <strong>Activate Delegation</strong>.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-3">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">3. Employee: Direct Spend</AccordionTrigger>
              <AccordionContent className="text-muted-foreground pt-2 pb-4">
                <ol className="list-decimal pl-5 space-y-2.5">
                  <li>Switch to the employee window.</li>
                  <li>Go to the <strong>Direct Spend</strong> tab.</li>
                  <li>Enter recipient, amount, and purpose.</li>
                  <li>Click <strong>Review Spend</strong>. The contract checks math limits. Venice AI checks policy.</li>
                  <li>Proceed to execute. You spend directly from delegated authority.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-4">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">4. Employee: Redelegate to an Agent</AccordionTrigger>
              <AccordionContent className="text-muted-foreground pt-2 pb-4">
                <ol className="list-decimal pl-5 space-y-2.5">
                  <li>Drag the <strong>Procurement Agent</strong> (or Travel Agent) from the sidebar to the canvas.</li>
                  <li>Click <strong>Configure</strong> and set child spending limits.</li>
                  <li>Click <strong>Sign and Activate Delegation</strong>.</li>
                  <li>Click <strong>Procure</strong> on the active agent and enter a business request.</li>
                  <li>Venice AI finds options. Approve one, and the agent executes autonomously.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-5">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">5. Agent: Autonomous Reimbursement</AccordionTrigger>
              <AccordionContent className="text-muted-foreground pt-2 pb-4">
                <ol className="list-decimal pl-5 space-y-2.5">
                  <li>On the employer dashboard, <strong>Activate</strong> the Reimbursement Agent.</li>
                  <li>On the employee dashboard, click the Reimbursement Agent in the sidebar.</li>
                  <li>Upload a receipt and submit a claim.</li>
                  <li>Venice Vision validates the receipt against company policy. If approved, the agent pays the employee directly.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </SheetContent>
    </Sheet>
  );
}
