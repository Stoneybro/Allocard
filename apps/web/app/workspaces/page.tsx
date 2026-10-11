"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ConnectRequiredCard } from "@/components/auth-state";
import { acceptEmployeeMembership, getWorkspaceOptions, setWorkspaceContext, type WorkspaceOption } from "@/app/actions/identity";

type PendingMembership = { id: string; companyId: string; companyName: string; createdAt: string };

export default function WorkspacePage() {
  const auth = useAuth();
  const router = useRouter();
  const [memberships, setMemberships] = useState<WorkspaceOption[]>([]);
  const [pending, setPending] = useState<PendingMembership[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    let cancelled = false;
    void (async () => {
      try {
        await auth.establishSession();
        const result = await getWorkspaceOptions(auth.address);
        if (!cancelled) {
          setMemberships(result.memberships);
          setPending(result.pending);
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load your companies");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [auth]);

  if (auth.status === "connecting") return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Checking your sign-in…</div>;
  if (auth.status === "unauthenticated") return <ConnectRequiredCard title="Sign in to Allocard" description="Use Google or email to open your company workspaces." />;

  const openWorkspace = (companyId: string, role: "employer" | "employee") => {
    setError(null);
    startTransition(async () => {
      try {
        await setWorkspaceContext({ walletAddress: auth.address, companyId, role });
        router.replace(role === "employer" ? "/employer" : "/employee");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not open that workspace");
      }
    });
  };

  const accept = (companyId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const profile = await acceptEmployeeMembership({ walletAddress: auth.address, companyId });
        if (profile.status === "picker") router.replace("/workspaces");
        else router.replace("/employee");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not accept company access");
      }
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-6">
      <section className="w-full max-w-2xl rounded-xl border border-[#eaeaea] p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#999]">Allocard</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111]">Choose a workspace</h1>
        <p className="mt-2 text-sm text-[#666]">Signed in as {auth.email ?? "your verified account"}. Companies and roles are kept separate.</p>
        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? <p className="mt-8 text-sm text-[#666]">Loading your companies…</p> : (
          <div className="mt-8 flex flex-col gap-8">
            {memberships.length > 0 && <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[#111]">Your companies</h2>
              {memberships.map((membership) => <div key={membership.companyId} className="flex flex-col gap-3 rounded-lg border border-[#eaeaea] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-semibold text-[#111]">{membership.companyName}</p><p className="mt-1 text-xs text-[#777]">{membership.canEmployer && membership.canEmployee ? "Employer and employee access" : membership.canEmployer ? "Employer access" : "Employee access"}</p></div>
                <div className="flex flex-wrap gap-2">
                  {membership.canEmployer && <button disabled={isPending} onClick={() => openWorkspace(membership.companyId, "employer")} className="rounded-md bg-[#111] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Employer</button>}
                  {membership.canEmployee && <button disabled={isPending} onClick={() => openWorkspace(membership.companyId, "employee")} className="rounded-md border border-[#ddd] px-3 py-2 text-sm font-medium text-[#222] disabled:opacity-50">Employee</button>}
                </div>
              </div>)}
            </div>}
            {pending.length > 0 && <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[#111]">Company access waiting for you</h2>
              {pending.map((membership) => <div key={membership.id} className="flex items-center justify-between gap-4 rounded-lg border border-[#eaeaea] p-4"><div><p className="font-semibold text-[#111]">{membership.companyName}</p><p className="mt-1 text-xs text-[#777]">Added for your verified email</p></div><button disabled={isPending} onClick={() => accept(membership.companyId)} className="rounded-md bg-[#111] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{isPending ? "Opening…" : "Accept"}</button></div>)}
            </div>}
            {memberships.length === 0 && pending.length === 0 && <div className="rounded-lg border border-[#eaeaea] bg-[#fafafa] p-5"><p className="font-semibold text-[#111]">No company access yet</p><p className="mt-1 text-sm text-[#666]">Create a company, or ask your employer to add {auth.email ?? "your verified email"}. Pending access will appear here.</p><Link href="/onboarding" className="mt-4 inline-flex rounded-md bg-[#111] px-4 py-2.5 text-sm font-medium text-white">Create a company</Link></div>}
          </div>
        )}
        <Link href="/" className="mt-8 inline-flex text-sm text-[#666] underline underline-offset-4">Back to Allocard</Link>
      </section>
    </main>
  );
}
