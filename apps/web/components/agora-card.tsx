"use client";

import { GlobeIcon, LoaderCircleIcon, RefreshCwIcon, SendIcon, ZapIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TOKEN_SYMBOL } from "@/lib/chain";
import {
  agoraEmployeeMessage,
  agoraStatusLabel,
  type AgoraProgram,
} from "@/lib/agora/shared";

export function AgoraCrossBorderCard({
  role,
  program,
  accountReady,
  busy = false,
  onOpen,
  onRefresh,
}: {
  role: "employer" | "employee";
  program: AgoraProgram;
  accountReady: boolean;
  busy?: boolean;
  onOpen: () => void;
  onRefresh: () => void;
}) {
  const employer = role === "employer";
  const authorized = program.status === "ready" || program.status === "exhausted";
  const employerMessage = authorized
    ? "International contractors submit multi-currency invoices, settled in Agora AUSD with 0% wire fees."
    : program.status === "unavailable"
      ? "The remittance service needs administrator configuration before a budget can be set."
      : "Authorize a company budget for global contractor payouts and multi-currency expenses on Monad.";

  return (
    <section id="agora-remittances" aria-labelledby="agora-remittances-title" className="h-full scroll-mt-4">
      <Card className="h-full flex flex-col justify-between border-border/70 bg-gradient-to-t from-primary/5 to-card shadow-xs transition-colors hover:border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle id="agora-remittances-title" className="flex items-center gap-2 text-base font-semibold">
              <GlobeIcon aria-hidden="true" className="size-4 text-primary" />
              <span>Global Remittances</span>
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
                {agoraStatusLabel(program.status)}
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
            {employer
              ? "Zero-fee cross-border contractor payouts and global spend settlement."
              : "Have a foreign contractor invoice or overseas expense? Settle in AUSD."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between gap-3 py-0">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {employer ? employerMessage : agoraEmployeeMessage(program.status)}
          </p>
          {employer && authorized && program.remainingAmount !== null && (
            <p className="text-xs font-medium">
              <span className="font-semibold text-foreground">
                {program.remainingAmount} {TOKEN_SYMBOL}
              </span>{" "}
              remaining in authorized budget
            </p>
          )}
          {!accountReady && (
            <p className="text-xs text-muted-foreground">
              {employer
                ? "Activate your company account above before setting up the remittance budget."
                : "Activate your account above to initiate cross-border settlements."}
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
            {busy ? (
              <LoaderCircleIcon className="size-3.5 mr-1.5 animate-spin" />
            ) : employer ? (
              <GlobeIcon className="size-3.5 mr-1.5" />
            ) : (
              <SendIcon className="size-3.5 mr-1.5" />
            )}
            {employer
              ? authorized
                ? "Manage remittance budget"
                : program.status === "pending"
                ? "Finish budget setup"
                : "Set up remittance budget"
              : program.status === "ready" && accountReady
              ? "Settle global invoice"
              : "View remittance status"}
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
