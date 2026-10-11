"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { ConnectRequiredCard } from "@/components/auth-state";
import { acceptEmployeeMembership, createEmployerAccount, getWorkspaceOptions, setWorkspaceContext, type WorkspaceOption } from "@/app/actions/identity";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type PendingMembership = { id: string; companyId: string; companyName: string; createdAt: string };

export default function OnboardingPage() {
  const auth = useAuth();
  const router = useRouter();
  const [memberships, setMemberships] = useState<WorkspaceOption[]>([]);
  const [pending, setPending] = useState<PendingMembership[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const actionInFlight = useRef(false);
  const [loadedRequest, setLoadedRequest] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const address = auth.status === "authenticated" ? auth.address : null;
  const establishSession = auth.status === "authenticated" ? auth.establishSession : null;

  const requestKey = address ? address + ":" + refresh : null;
  const loading = !requestKey || loadedRequest !== requestKey;

  useEffect(() => {
    if (!address || !establishSession) return;
    let cancelled = false;
    void (async () => {
      try {
        await establishSession();
        const result = await getWorkspaceOptions(address);
        if (!cancelled) {
          setLoadError(null);
          setMemberships(result.memberships);
          setPending(result.pending);
        }
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Could not load your workspaces.");
      } finally {
        if (!cancelled) setLoadedRequest(requestKey);
      }
    })();
    return () => { cancelled = true; };
  }, [address, establishSession, requestKey]);

  const performAction = (key: string, action: () => Promise<void>) => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setActiveAction(key);
    setActionError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      } finally {
        actionInFlight.current = false;
        setActiveAction(null);
      }
    });
  };

  if (auth.status === "unauthenticated") {
    return <ConnectRequiredCard title="Sign in to Allocard" description="Create or join your company." />;
  }

  const busy = loading || isPending || auth.status === "connecting";
  const hasEmployerWorkspace = memberships.some((membership) => membership.canEmployer);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="Allocard home">
            <Image src="/AllocardLogoBlack.svg" alt="" width={28} height={28} />
            Allocard
          </Link>

        </div>
      </header>
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-12 sm:py-16">

        {actionError && <Alert variant="destructive"><AlertTitle>Could not complete that action</AlertTitle><AlertDescription>{actionError}</AlertDescription></Alert>}

        <div className="flex flex-col gap-6">
          {(loading || !!loadError || memberships.length > 0 || pending.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Your companies</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5" aria-busy={loading || auth.status === "connecting"}>
              {loading || auth.status === "connecting" ? (
                <div className="flex flex-col gap-3" role="status">
                  <span className="sr-only">Loading your workspaces</span>
                  <Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" />
                </div>
              ) : loadError ? (
                <Alert variant="destructive"><AlertTitle>Workspaces could not load</AlertTitle><AlertDescription>{loadError}</AlertDescription></Alert>
              ) : (
                <>
                  {memberships.map((membership) => (
                    <div key={membership.companyId} className="flex flex-col gap-3 rounded-lg border border-border p-4">
                      <div className="flex items-center gap-3"><Building2 className="size-4 shrink-0 text-muted-foreground" /><h2 className="min-w-0 break-words text-sm font-semibold">{membership.companyName}</h2></div>
                      <div className="flex flex-wrap gap-2">
                        {(["employer", "employee"] as const).filter((role) => role === "employer" ? membership.canEmployer : membership.canEmployee).map((role) => {
                          const key = membership.companyId + role;
                          return <Button key={role} variant={role === "employer" ? "default" : "outline"} disabled={busy} onClick={() => performAction(key, async () => {
                            await setWorkspaceContext({ walletAddress: address!, companyId: membership.companyId, role });
                            router.push(role === "employer" ? "/employer" : "/employee");
                          })}>{activeAction === key ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <ArrowRight data-icon="inline-start" />}{role === "employer" ? "Employer" : "Employee"}</Button>;
                        })}
                      </div>
                    </div>
                  ))}
                  {pending.length > 0 && <section className="flex flex-col gap-3" aria-label="Pending invitations">
                    <p className="text-xs font-medium text-muted-foreground">Waiting for you</p>
                    {pending.map((membership) => <div key={membership.id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-3"><h2 className="min-w-0 break-words text-sm font-semibold">{membership.companyName}</h2><Badge variant="secondary">Invitation</Badge></div>
                      <Button variant="outline" disabled={busy} onClick={() => performAction(membership.id, async () => {
                        await acceptEmployeeMembership({ walletAddress: address!, companyId: membership.companyId });
                        await setWorkspaceContext({ walletAddress: address!, companyId: membership.companyId, role: "employee" });
                        router.push("/employee");
                      })}>{activeAction === membership.id ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <ArrowRight data-icon="inline-start" />}Accept invitation</Button>
                    </div>)}
                  </section>}

                </>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="ghost" disabled={busy} onClick={() => setRefresh((value) => value + 1)}><RefreshCw data-icon="inline-start" />{loadError ? "Try again" : "Refresh access"}</Button>
            </CardFooter>
          </Card>
          )}

          {!loading && !loadError && !hasEmployerWorkspace && <Card>
            <CardHeader>
              <CardTitle>Create a company</CardTitle>
            </CardHeader>
            <CardContent>
                <form className="flex flex-col gap-5" onSubmit={(event) => {
                  event.preventDefault();
                  if (busy || !address || companyName.trim().length < 2) return;
                  performAction("create", async () => {
                    await createEmployerAccount({ walletAddress: address, companyName: companyName.trim() });
                    router.push("/employer");
                  });
                }}>
                  <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
                    <Label htmlFor="company-name">Company name</Label>
                    <Input id="company-name" name="companyName" placeholder="Acme Labs" autoComplete="organization" required minLength={2} maxLength={80} value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
                  </fieldset>
                  <Button size="lg" type="submit" disabled={busy || !!loadError || companyName.trim().length < 2}>{activeAction === "create" ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Building2 data-icon="inline-start" />}{activeAction === "create" ? "Creating company…" : "Create company"}</Button>
                </form>
            </CardContent>
          </Card>}
        </div>
        {!loading && !loadError && memberships.length === 0 && pending.length === 0 && <p className="text-center text-sm leading-relaxed text-muted-foreground">Joining as an employee? Ask your employer to add {auth.status === "authenticated" && auth.email ? <span className="break-words font-medium text-foreground">{auth.email}</span> : "your email"} to their company.</p>}
      </div>
    </main>
  );
}
