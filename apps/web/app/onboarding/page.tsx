"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createEmployerAccount } from "@/app/actions/identity";
import { ConnectRequiredCard } from "@/components/auth-state";
import { createSession } from "@/lib/session";

function routeForStatus(status: "new" | "employer" | "employee") {
  if (status === "employer") return "/employer";
  if (status === "employee") return "/employee";
  return null;
}

// ── Inline loading / error states ─────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin text-[#999]"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" className="opacity-100" />
      <path strokeLinecap="round" d="M12 2a10 10 0 0 0-10 10" className="opacity-20" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const auth = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [employeeSelected, setEmployeeSelected] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ── Auth guards ───────────────────────────────────────────────────────────

  if (auth.status === "unauthenticated") {
    return <ConnectRequiredCard />;
  }

  if (auth.status === "initializing") {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center p-6 bg-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <Spinner />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-[#111]">Initializing wallet</p>
            <p className="text-xs text-[#999]">{(auth.elapsed / 1000).toFixed(1)}s elapsed</p>
          </div>
        </div>
      </div>
    );
  }

  if (auth.status === "error") {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center p-6 bg-white">
        <div className="flex flex-col items-center gap-5 text-center max-w-sm">
          <div className="w-10 h-10 rounded-full border border-[#eaeaea] flex items-center justify-center text-[#999]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-[#111]">Wallet initialization failed</p>
            <p className="text-xs text-[#666] leading-relaxed">{auth.message}</p>
          </div>
          <button
            onClick={auth.retry}
            className="h-9 px-5 rounded-md bg-[#111] text-white text-sm font-medium hover:bg-[#333] transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Create company handler ─────────────────────────────────────────────────

  const handleCreateCompany = () => {
    if (companyName.trim().length < 2) return;
    setError(null);

    startTransition(async () => {
      try {
        const profile = await createEmployerAccount({
          walletAddress: auth.address,
          companyName: companyName.trim(),
        });
        await createSession(auth.address);
        const route = routeForStatus(profile.status);
        router.replace(route ?? "/onboarding");
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : "Company setup failed";
        setError(message);
      }
    });
  };

  // ── Main page ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-white p-6">
      <div className="w-full max-w-2xl flex flex-col gap-10">

        {/* Header */}
        <div className="flex flex-col gap-3 text-center">
          <div className="inline-flex items-center self-center gap-2 px-3 py-1 rounded-full border border-[#eaeaea] bg-[#fafafa]">
            <span className="text-xs text-[#666] font-medium">Wallet connected</span>
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-[#111]">
            Set up your workspace
          </h1>
          <p className="text-sm text-[#666] max-w-sm mx-auto leading-relaxed">
            Create a company account. Or use an invite link from your employer to join as an employee.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Employer card */}
          <div className="rounded-xl border border-[#eaeaea] bg-white p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <div className="w-8 h-8 rounded-lg border border-[#eaeaea] flex items-center justify-center text-[#555] mb-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#111]">Create a company</p>
              <p className="text-xs text-[#666] leading-relaxed">
                You are the company owner. You deploy the smart account and issue delegations.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="company-name" className="text-xs font-medium text-[#555]">
                  Company name
                </label>
                <input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateCompany()}
                  placeholder="Acme Labs"
                  maxLength={80}
                  className="h-9 w-full rounded-md border border-[#eaeaea] bg-white px-3 text-sm text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#999] transition-colors"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600">{error}</p>
              )}

              <button
                onClick={handleCreateCompany}
                disabled={isPending || companyName.trim().length < 2}
                className="h-9 w-full rounded-md bg-[#111] text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
              >
                {isPending && <Spinner />}
                {isPending ? "Creating..." : "Create company"}
              </button>
            </div>
          </div>

          {/* Employee card */}
          <div className="rounded-xl border border-[#eaeaea] bg-white p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <div className="w-8 h-8 rounded-lg border border-[#eaeaea] flex items-center justify-center text-[#555] mb-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#111]">Join as an employee</p>
              <p className="text-xs text-[#666] leading-relaxed">
                Employees join through an invite link. Your employer generates this link from their dashboard.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setEmployeeSelected((v) => !v)}
                className="h-9 w-full rounded-md border border-[#eaeaea] text-[#444] text-sm font-medium hover:border-[#ccc] hover:bg-[#fafafa] transition-colors cursor-pointer"
              >
                I have an invite link
              </button>

              {employeeSelected && (
                <div className="rounded-lg border border-[#eaeaea] bg-[#fafafa] p-3">
                  <p className="text-xs text-[#666] leading-relaxed">
                    Ask your company admin for an invite link. Open the link in this browser to join.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
