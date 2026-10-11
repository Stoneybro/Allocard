"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { ConnectRequiredCard } from "@/components/auth-state";

export function InviteClient() {
  const auth = useAuth();
  if (auth.status === "connecting") {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Checking your sign-in…</div>;
  }
  if (auth.status === "unauthenticated") {
    return <ConnectRequiredCard title="Sign in to Allocard" description="Invite links have been retired. Sign in with Google or email; a company will appear if your employer added your verified email." />;
  }
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md rounded-xl border border-[#eaeaea] bg-white p-8">
        <h1 className="text-xl font-semibold text-[#111]">This invite link is no longer used</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#666]">Your signed-in account is {auth.email ?? "verified"}. If an employer added this verified email, open your workspace to review and accept the company membership.</p>
        <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-md bg-[#111] px-4 text-sm font-medium text-white">Open Allocard</Link>
      </section>
    </main>
  );
}
