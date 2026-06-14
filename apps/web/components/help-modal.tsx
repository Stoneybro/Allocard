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

        <div className="space-y-6 text-sm text-foreground/90 pb-8">
          <section className="rounded-xl border bg-muted/30 p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">💡</span>
              Demo Tips: Testing Both Roles
            </h3>
            <div className="space-y-3 text-muted-foreground">
              <p>
                MetaMask Embedded Wallets stores the session in your browser's local storage. To run employer and employee accounts simultaneously, you must use separate browser contexts so they don't share a wallet:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-foreground/80">
                <li><strong>Normal window + Incognito window (easiest)</strong>: Employer in the normal window, employee in an Incognito window.</li>
                <li><strong>Two browser profiles</strong>: Chrome Profile 1 for employer, Chrome Profile 2 for employee.</li>
                <li><strong>Two different browsers</strong>: Employer in Chrome, employee in Firefox.</li>
              </ul>
              <p className="font-medium text-foreground">
                Recommended: Open the employer dashboard in a normal window, then open the employee invite link in an Incognito window and authenticate with a different account.
              </p>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground mb-3 border-b pb-2">Step 1: Employer Setup</h3>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
              <li><span className="text-foreground">Connect a wallet</span> via MetaMask Embedded Wallets.</li>
              <li><span className="text-foreground">Create a company</span> (enter a company name).</li>
              <li><span className="text-foreground">Activate the company smart account</span>. This deploys an ERC-4337 contract on ETH Sepolia.</li>
              <li>In the sidebar, <span className="text-foreground">generate an invite link</span> and copy it.</li>
            </ol>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground mb-3 border-b pb-2">Step 2: Employee Onboarding</h3>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
              <li>Paste the invite link into the second browser context (Incognito window).</li>
              <li><span className="text-foreground">Authenticate with a different wallet</span>.</li>
              <li><span className="text-foreground">Activate the employee smart account</span> from the dashboard banner.</li>
            </ol>
            <p className="mt-3 text-xs font-medium text-primary/80 bg-primary/5 p-2 rounded">The employee now appears in the employer's sidebar.</p>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground mb-3 border-b pb-2">Step 3: Employer Issues a Delegation</h3>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
              <li>Switch back to the employer window.</li>
              <li><span className="text-foreground">Drag the employee node</span> from the sidebar onto the canvas.</li>
              <li>Click <strong>Configure</strong> on the new pending node.</li>
              <li>Set the spending rules (e.g. lifetime limit, per-transaction cap).</li>
              <li>Click <strong>Activate Delegation</strong>. The smart account signs the delegation.</li>
            </ol>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground mb-3 border-b pb-2">Step 4: Employee Redelegates to an Agent</h3>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
              <li>Switch back to the employee window.</li>
              <li>From the sidebar, <span className="text-foreground">drag an AI agent</span> onto the canvas.</li>
              <li>Click <strong>Configure</strong> on the new pending agent node.</li>
              <li>Set child limits (capped at what the employer gave the employee).</li>
              <li>Click <strong>Sign and Activate Delegation</strong>.</li>
            </ol>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground mb-4 border-b pb-2">Step 5: Agent Execution</h3>
            
            <div className="space-y-6">
              <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span className="text-lg">🧾</span> Reimbursement claim
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
                  <li>Click to open the Reimbursement Agent from the sidebar.</li>
                  <li>Enter a description, amount, and optionally upload a receipt.</li>
                  <li>Submit the claim. Venice AI scans the receipt and checks company policy.</li>
                  <li>If approved, ETH is transferred directly to the employee's wallet.</li>
                </ol>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span className="text-lg">✈️</span> Travel or Procurement request
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
                  <li>Click <strong>Book Trip</strong> or <strong>Procure</strong> on the active agent node.</li>
                  <li>Enter the request details.</li>
                  <li>Venice AI returns a proposed itinerary or vendor recommendation.</li>
                  <li>Click <strong>Approve</strong>. The agent executes the on-chain payment.</li>
                </ol>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span className="text-lg">💳</span> Direct spend
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
                  <li>Open the Wallet and Direct Spend tab.</li>
                  <li>Enter a recipient address, ETH amount, and purpose.</li>
                  <li>Click <strong>Review Spend</strong>. Venice evaluates the purpose against company policy.</li>
                  <li>Review the verdict and proceed.</li>
                </ol>
              </div>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
