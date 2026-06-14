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
      <div className="flex h-full min-h-screen items-center justify-center p-6 bg-white">
        <div className="flex flex-col items-center gap-6 text-center">
          <img src="/AllocardLogoBlack.svg" alt="Allocard Logo" className="w-16 h-16 object-contain mb-4" />
          <div className="w-10 h-10 border-4 border-[#eaeaea] border-t-[#111] rounded-full animate-spin"></div>
          <p className="text-xl font-bold text-[#111] tracking-[-0.02em]">Initializing wallet...</p>
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
        await createSession(auth.address);
        const profile = await createEmployerAccount({
          walletAddress: auth.address,
          companyName: companyName.trim(),
        });
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
    <div className="flex h-full min-h-screen items-center justify-center bg-white p-6 relative">
      {/* Top right badges */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-[#eaeaea] bg-white text-[#111]">
          <span className="text-sm font-medium">ETH Sepolia</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#eaeaea] bg-white text-[#111]">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
          </svg>
          <span className="text-sm font-medium">Wallet connected</span>
        </div>
      </div>

      <div className="w-full max-w-3xl flex flex-col gap-12">

        {/* Header */}
        <div className="flex flex-col items-center text-center gap-4">
          <img src="/AllocardLogoBlack.svg" alt="Allocard Logo" className="w-16 h-16 object-contain mb-2" />
          <h1 className="text-4xl font-bold tracking-[-0.03em] text-[#111]">
            Set up your workspace
          </h1>
          <p className="text-base text-[#666] max-w-md mx-auto leading-relaxed">
            Create a company account. Or use an invite link from your employer to join as an employee.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-2">

          {/* Employer card */}
          <div className="rounded-xl border border-[#eaeaea] bg-white p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-lg border border-[#eaeaea] flex items-center justify-center text-[#555] mb-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-[#111]">Create a company</p>
              <p className="text-sm text-[#666] leading-relaxed">
                You are the company owner. You deploy the master expense card (smart account) and issue delegations.
              </p>
            </div>

            <div className="flex flex-col gap-4 mt-auto">
              <div className="flex flex-col gap-2">
                <label htmlFor="company-name" className="text-sm font-medium text-[#555]">
                  Company name
                </label>
                <input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateCompany()}
                  placeholder="Acme Labs"
                  maxLength={80}
                  className="h-12 w-full rounded-md border border-[#eaeaea] bg-white px-4 text-base text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#999] transition-colors"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <button
                onClick={handleCreateCompany}
                disabled={isPending || companyName.trim().length < 2}
                className="h-12 w-full rounded-md bg-[#111] text-white text-base font-semibold hover:bg-[#333] transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
              >
                {isPending && <Spinner />}
                {isPending ? "Creating..." : "Create company"}
              </button>
            </div>
          </div>

          {/* Employee card */}
          <div className="rounded-xl border border-[#eaeaea] bg-white p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-lg border border-[#eaeaea] flex items-center justify-center text-[#555] mb-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-[#111]">Join as an employee</p>
              <p className="text-sm text-[#666] leading-relaxed">
                Employees join through an invite link. Your employer generates this link from their dashboard.
              </p>
            </div>

            <div className="flex flex-col gap-4 mt-auto">
              <button
                onClick={() => setEmployeeSelected((v) => !v)}
                className="h-12 w-full rounded-md border border-[#eaeaea] text-[#444] text-base font-semibold hover:border-[#ccc] hover:bg-[#fafafa] transition-colors cursor-pointer"
              >
                I have an invite link
              </button>

              {employeeSelected && (
                <div className="rounded-lg border border-[#eaeaea] bg-[#fafafa] p-4">
                  <p className="text-xs text-[#666] leading-relaxed">
                    If you are a demo tester, get the employee invite link from the company dashboard and open it in another browser, a different browser profile, or an incognito window.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Demo Tester Alert */}
        <div className="flex items-start gap-3 p-4 rounded-md border border-[#111] bg-[#fafafa] text-[#111]">
          <svg className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold">Demo testing notice</p>
            <p className="text-sm leading-relaxed text-[#444]">
              If you are a demo tester, get the employee invite link from the company dashboard and open it in another browser, a different browser profile, or an incognito window.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
