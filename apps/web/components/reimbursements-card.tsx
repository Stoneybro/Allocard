"use client";

import { LoaderCircleIcon, ReceiptTextIcon, RefreshCwIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TOKEN_SYMBOL } from "@/lib/chain";
import {
  reimbursementEmployeeMessage,
  reimbursementStatusLabel,
  type ReimbursementProgram,
} from "@/lib/reimbursements/shared";

export function ReimbursementsCard({
  role, program, accountReady, busy = false, onOpen, onRefresh,
}: {
  role: "employer" | "employee";
  program: ReimbursementProgram;
  accountReady: boolean;
  busy?: boolean;
  onOpen: () => void;
  onRefresh: () => void;
}) {
  const employer = role === "employer";
  const authorized = program.status === "ready" || program.status === "exhausted";
  const employerMessage = authorized
    ? "Employees submit receipts here in their workspace. Claims that pass receipt and policy checks are paid within the budget you authorize."
    : program.status === "unavailable"
      ? "The reimbursement service needs administrator attention before a budget can be configured."
      : "Authorize a shared budget for employee reimbursements. Your company expense policy applies to every claim. You can stop payouts from the budget settings.";

  return (
    <section id="reimbursements" aria-labelledby="reimbursements-title" className="scroll-mt-4">
      <Card className="border-border/70 bg-gradient-to-t from-primary/5 to-card shadow-xs transition-colors hover:border-border">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle id="reimbursements-title" className="flex items-center gap-2">
              <ReceiptTextIcon aria-hidden="true" className="size-5 text-primary" />
              Reimbursements
            </CardTitle>
            <Badge
              variant={program.status === "ready" ? "secondary" : "outline"}
              className={
                program.status === "ready"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium"
                  : program.status === "pending"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium"
                  : program.status === "exhausted" || program.status === "paused"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium"
                  : ""
              }
            >
              {reimbursementStatusLabel(program.status)}
            </Badge>
          </div>
          <CardDescription>
            {employer ? "Pay employees back for business expenses." : "Paid for work out of pocket? Claim it back here."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {employer ? employerMessage : reimbursementEmployeeMessage(program.status)}
          </p>
          {employer && authorized && program.remainingAmount !== null && (
            <p className="text-sm">
              <span className="font-semibold text-foreground">{program.remainingAmount} {TOKEN_SYMBOL}</span> remaining in the authorized budget
            </p>
          )}
          {!accountReady && (
            <p className="text-sm text-muted-foreground">
              {employer ? "Activate your company account above before authorizing a budget." : "Activate your account above to receive reimbursement payments."}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button onClick={onOpen} disabled={busy || (employer && (!accountReady || program.status === "unavailable"))}>
            {busy ? <LoaderCircleIcon className="size-4 mr-2 animate-spin" /> : <ReceiptTextIcon className="size-4 mr-2" />}
            {employer
              ? authorized ? "Manage reimbursement budget" : program.status === "pending" ? "Finish budget setup" : "Set up reimbursement budget"
              : program.status === "ready" && accountReady ? "New reimbursement claim" : "View reimbursement status"}
          </Button>
          <Button variant="outline" onClick={onRefresh} disabled={busy}>
            <RefreshCwIcon className="size-4 mr-2" />
            Refresh status
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
