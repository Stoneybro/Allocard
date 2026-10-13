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
    ? "Claims that pass receipt and policy checks are paid from your authorized budget."
    : program.status === "unavailable"
      ? "The reimbursement service needs administrator attention before a budget can be configured."
      : "Authorize a company budget for employee reimbursements. Your spending policy applies to every claim.";

  return (
    <section id="reimbursements" aria-labelledby="reimbursements-title" className="h-full scroll-mt-4">
      <Card className="h-full flex flex-col justify-between border-border/70 bg-gradient-to-t from-primary/5 to-card shadow-xs transition-colors hover:border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle id="reimbursements-title" className="flex items-center gap-2 text-base font-semibold">
              <ReceiptTextIcon aria-hidden="true" className="size-4 text-primary" />
              Reimbursements
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <Badge
                variant={program.status === "ready" ? "secondary" : "outline"}
                className={
                  program.status === "ready"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-medium"
                    : program.status === "pending"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-medium"
                    : program.status === "exhausted" || program.status === "paused"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs font-medium"
                    : "text-xs"
                }
              >
                {reimbursementStatusLabel(program.status)}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={onRefresh}
                disabled={busy}
                title="Refresh status"
              >
                <RefreshCwIcon className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs">
            {employer ? "Review and pay employee expense claims." : "Paid for work out of pocket? Claim it back here."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between gap-3 py-0">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {employer ? employerMessage : reimbursementEmployeeMessage(program.status)}
          </p>
          {employer && authorized && program.remainingAmount !== null && (
            <p className="text-xs font-medium">
              <span className="font-semibold text-foreground">{program.remainingAmount} {TOKEN_SYMBOL}</span> remaining in authorized budget
            </p>
          )}
          {!accountReady && (
            <p className="text-xs text-muted-foreground">
              {employer ? "Activate your company account above before authorizing a budget." : "Activate your account above to receive reimbursement payments."}
            </p>
          )}
        </CardContent>
        <CardFooter className="pt-4">
          <Button
            size="sm"
            className="w-full text-xs font-medium cursor-pointer"
            onClick={onOpen}
            disabled={busy || (employer && (!accountReady || program.status === "unavailable"))}
          >
            {busy ? <LoaderCircleIcon className="size-3.5 mr-1.5 animate-spin" /> : <ReceiptTextIcon className="size-3.5 mr-1.5" />}
            {employer
              ? authorized ? "Manage reimbursement budget" : program.status === "pending" ? "Finish budget setup" : "Set up reimbursement budget"
              : program.status === "ready" && accountReady ? "New reimbursement claim" : "View reimbursement status"}
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
