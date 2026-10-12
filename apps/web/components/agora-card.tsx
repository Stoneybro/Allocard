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
    ? "International contractors and overseas employees submit multi-currency invoices here. Settled instantly in Agora AUSD with 0% bank wire fees."
    : program.status === "unavailable"
      ? "The Agora remittance service needs administrator configuration."
      : "Authorize a dedicated company pool for global contractor payouts and multi-currency expenses. Settles across borders in seconds on Monad.";

  return (
    <section id="agora-remittances" aria-labelledby="agora-remittances-title" className="scroll-mt-4">
      <Card className="border-border/70 bg-gradient-to-t from-primary/5 to-card shadow-xs transition-colors hover:border-border">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle id="agora-remittances-title" className="flex items-center gap-2">
              <GlobeIcon aria-hidden="true" className="size-5 text-primary" />
              <span>Agora Remittances</span>
              <Badge variant="outline" className="text-xs font-mono font-normal tracking-wide bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                AUSD • Monad
              </Badge>
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
              {agoraStatusLabel(program.status)}
            </Badge>
          </div>
          <CardDescription>
            {employer
              ? "Zero-fee cross-border contractor payouts and global spend settlement."
              : "Have a foreign contractor invoice or overseas expense? Settle in AUSD."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {employer ? employerMessage : agoraEmployeeMessage(program.status)}
          </p>
          {employer && authorized && program.remainingAmount !== null && (
            <p className="text-sm">
              <span className="font-semibold text-foreground">
                {program.remainingAmount} {TOKEN_SYMBOL}
              </span>{" "}
              available in the cross-border remittance pool
            </p>
          )}
          {!accountReady && (
            <p className="text-sm text-muted-foreground">
              {employer
                ? "Activate your company account above before setting up the remittance pool."
                : "Activate your account above to initiate cross-border settlements."}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            onClick={onOpen}
            disabled={busy || (employer && (!accountReady || program.status === "unavailable"))}
          >
            {busy ? (
              <LoaderCircleIcon className="size-4 mr-2 animate-spin" />
            ) : employer ? (
              <ZapIcon className="size-4 mr-2 text-amber-500" />
            ) : (
              <SendIcon className="size-4 mr-2" />
            )}
            {employer
              ? authorized
                ? "Manage Remittance Pool"
                : program.status === "pending"
                ? "Finish Pool Setup"
                : "Set Up Remittance Pool"
              : program.status === "ready" && accountReady
              ? "Settle Global Invoice"
              : "View Remittance Status"}
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
