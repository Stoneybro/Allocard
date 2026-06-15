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

        <div className="space-y-8 text-sm text-foreground/90 pb-8 px-2">
          <section>
            <h3 className="text-base font-semibold text-foreground mb-3">Demo Tips: Testing Both Roles</h3>
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

          <section>
            <h3 className="text-base font-semibold text-foreground mb-3 border-b pb-2">Step 1: Company to Employee Delegation</h3>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
              <li>Open the employer dashboard. Ensure the master company smart account is funded.</li>
              <li>Drag the employee node from the sidebar onto the canvas.</li>
              <li>Click <strong>Configure</strong> on the new pending node.</li>
              <li>Set a maximum delegation amount (e.g., 0.1 ETH) and click <strong>Activate Delegation</strong>.</li>
              <li>Switch to the employee dashboard and refresh the canvas to see the delegated balance.</li>
            </ol>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground mb-3 border-b pb-2">Step 2: Direct Spend Execution</h3>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
              <li>On the employee dashboard, open the <strong>Direct Spend</strong> tab.</li>
              <li>Enter a recipient address, amount, and the purpose of the expense.</li>
              <li>Click <strong>Review Spend</strong>. Allocard checks the delegation caveats and Venice AI reviews the purpose.</li>
              <li>If the expense is valid, proceed with the transaction. The employee spends directly from delegated authority without holding company funds.</li>
            </ol>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground mb-3 border-b pb-2">Step 3: Company to Employee to Agent (Redelegation)</h3>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
              <li>From the employee dashboard sidebar, drag the <strong>Procurement Agent</strong> onto the canvas.</li>
              <li>Click <strong>Configure</strong> on the new pending agent node.</li>
              <li>Set the child spending limits and click <strong>Sign and Activate Delegation</strong>.</li>
              <li>Click <strong>Procure</strong> on the active agent node and enter a business request.</li>
              <li>The agent uses Venice AI to find suitable options. Once approved, the agent executes the purchase using its redelegated authority.</li>
            </ol>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground mb-3 border-b pb-2">Step 4: Company to Agent to Employee (Reimbursements)</h3>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
              <li>Switch back to the employer dashboard.</li>
              <li>Activate the <strong>Reimbursement Agent</strong> to give it a direct delegation from the company.</li>
              <li>Switch to the employee dashboard and open the Reimbursement Agent from the sidebar.</li>
              <li>Upload a receipt and submit a reimbursement claim.</li>
              <li>Venice AI validates the receipt data against company policy. If approved, the agent executes the payment automatically to the employee's wallet.</li>
            </ol>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground mb-3 border-b pb-2">Step 5: Master Canvas Monitoring</h3>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
              <li>Return to the employer canvas.</li>
              <li>Monitor the entire delegation tree, including employees, agents, and activity from a single interface.</li>
            </ol>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
