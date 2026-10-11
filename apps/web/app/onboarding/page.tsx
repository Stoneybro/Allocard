"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createEmployerAccount } from "@/app/actions/identity";
import { ConnectRequiredCard } from "@/components/auth-state";

function routeForStatus(status: "new" | "picker" | "employer" | "employee") {
  if (status === "picker") return "/workspaces";
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
  const [isPending, startTransition] = useTransition();

  // ── Auth guards ───────────────────────────────────────────────────────────

  if (auth.status === "unauthenticated") {
    return <ConnectRequiredCard />;
  }

  if (auth.status === "connecting") {
    return (
      <div className="flex h-full min-h-screen items-center justify-center p-6 bg-white">
        <div className="flex flex-col items-center gap-6 text-center">
          <img src="/AllocardLogoBlack.svg" alt="Allocard Logo" className="w-16 h-16 object-contain mb-4" />
          <div className="w-10 h-10 border-4 border-[#eaeaea] border-t-[#111] rounded-full animate-spin"></div>
          <p className="text-xl font-bold text-[#111] tracking-[-0.02em]">Checking your sign-in...</p>
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
        await auth.establishSession();
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
          <span className="text-sm font-medium">Signed in</span>
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
            Create a company account, or join a company after your employer adds your verified email.
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
                When an employer adds your verified email, the company will appear in your workspace.
              </p>
            </div>

            <div className="flex flex-col gap-4 mt-auto">
              <p className="rounded-lg border border-[#eaeaea] bg-[#fafafa] p-4 text-sm leading-relaxed text-[#666]">
                You are signed in as {auth.status === "authenticated" ? auth.email ?? "your verified account" : "your verified account"}. Ask your employer to add this email; company access will appear here after you accept it.
              </p>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
