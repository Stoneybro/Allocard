"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useLogin } from "@privy-io/react-auth";
import { getWalletProfile } from "@/app/actions/identity";
import Image from "next/image";

function routeForStatus(status: "new" | "picker" | "employer" | "employee") {
  if (status === "employer") return "/employer";
  if (status === "employee") return "/employee";
  return "/onboarding";
}

export function LandingPageClient({
  initialWalletAddress,
  initialProfileStatus,
}: {
  initialWalletAddress?: string | null;
  initialProfileStatus?: "employer" | "employee" | "picker" | "new" | null;
} = {}) {
  const router = useRouter();
  const auth = useAuth();
  const [isRouting, startRouting] = useTransition();
  const [userInitiatedLogin, setUserInitiatedLogin] = useState(false);
  const pendingClickRef = useRef(false);

  const isAuthenticated = Boolean(
    initialWalletAddress || auth.status === "authenticated"
  );

  const navigateToDashboard = useCallback(() => {
    startRouting(async () => {
      try {
        const address = auth.status === "authenticated" ? auth.address : initialWalletAddress;
        if (auth.status === "authenticated") {
          await auth.establishSession();
        }
        if (address) {
          const profile = await getWalletProfile(address);
          router.push(routeForStatus(profile.status));
          return;
        }
      } catch {
        // fallback
      }
      if (initialProfileStatus) {
        router.push(routeForStatus(initialProfileStatus));
        return;
      }
      router.push("/onboarding");
    });
  }, [auth, initialWalletAddress, initialProfileStatus, router]);

  const { login } = useLogin({
    onComplete: () => {
      sessionStorage.setItem("allocard_user_logging_in", "true");
      setUserInitiatedLogin(true);
      navigateToDashboard();
    },
    onError: () => {
      sessionStorage.removeItem("allocard_user_logging_in");
      setUserInitiatedLogin(false);
    },
  });

  // When a user explicitly signs in, automatically route to the dashboard.
  // When a user simply opens or reloads the page with saved credentials, do NOT auto-route.
  useEffect(() => {
    const isLoggingIn =
      userInitiatedLogin ||
      (typeof window !== "undefined" &&
        sessionStorage.getItem("allocard_user_logging_in") === "true");

    if (!isLoggingIn) return;

    if (auth.status === "authenticated") {
      sessionStorage.removeItem("allocard_user_logging_in");
      setUserInitiatedLogin(false);
      navigateToDashboard();
    } else if (auth.status === "unauthenticated" && pendingClickRef.current) {
      pendingClickRef.current = false;
      login();
    }
  }, [userInitiatedLogin, auth.status, navigateToDashboard, login]);

  const handleConnect = () => {
    if (isRouting) return;

    if (isAuthenticated) {
      navigateToDashboard();
      return;
    }

    sessionStorage.setItem("allocard_user_logging_in", "true");
    setUserInitiatedLogin(true);

    if (auth.status === "unauthenticated") {
      login();
      return;
    }

    if (auth.status === "connecting") {
      pendingClickRef.current = true;
    }
  };

  const buttonLabel = (() => {
    if (isRouting) return "Opening dashboard...";
    if (isAuthenticated) return "Go to Dashboard";
    return "Sign in";
  })();

  const isBusy = isRouting;

  return (
    <div className="landing landing-restored min-h-screen font-sans antialiased">

      <a className="landing-skip" href="#main">Skip to content</a>

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-[#eaeaea] bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#111]">
            <Image src="/AllocardLogoBlack.svg" alt="Allocard Logo" width={28} height={28} />
            Allocard
          </a>
          <div className="hidden md:flex items-center gap-6">
            <a href="#problem" className="text-sm text-[#666] hover:text-[#111] transition-colors">The Problem</a>
            <a href="#how-it-works" className="text-sm text-[#666] hover:text-[#111] transition-colors">How it Works</a>
            <a href="#spend-rails" className="text-sm text-[#666] hover:text-[#111] transition-colors">Spend Rails</a>
            <a href="#canvas" className="text-sm text-[#666] hover:text-[#111] transition-colors">Live Canvas</a>
            <a
              href="https://github.com/Stoneybro/Allocard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#666] hover:text-[#111] transition-colors"
            >
              GitHub
            </a>
          </div>
          <button
            id="nav-cta"
            onClick={handleConnect}
            disabled={isBusy}
            className="h-8 px-4 rounded-md bg-[#111] text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-40 cursor-pointer"
          >
            {buttonLabel}
          </button>
        </div>
      </nav>

      <main id="main" className="pt-14">

        {/* ── Hero ── */}
        <section id="hero" className="max-w-6xl mx-auto px-6 pt-24 pb-16 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#eaeaea] bg-[#fafafa] mb-8">
            <span className="text-xs text-[#666] font-medium">Monad Metropolis · Product & Consumer Track</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-[-0.04em] leading-[1] max-w-4xl mb-6 text-[#111]">
            Corporate cards<br className="hidden sm:block" /> without the corporate risk.
          </h1>

          <p className="max-w-xl text-base sm:text-lg text-[#666] leading-relaxed mb-10">
            Give your team the freedom to pay for business expenses without ever handing over company funds in advance. Allocard lets you authorize exact spending permissions while 100% of your treasury remains securely in your company account.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              id="hero-try-demo"
              onClick={handleConnect}
              disabled={isBusy}
              className="h-10 px-6 rounded-md bg-[#111] text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-40 cursor-pointer"
            >
              {buttonLabel}
            </button>
            <a
              id="hero-view-github"
              href="https://github.com/Stoneybro/Allocard"
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-6 rounded-md border border-[#eaeaea] text-[#444] text-sm font-medium hover:border-[#ccc] hover:bg-[#fafafa] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
              </svg>
              View on GitHub
            </a>
          </div>

          <p className="text-xs text-[#999] mb-12">
            Free to start · Built for teams of 2 to 20,000 · 1-click Google or email sign-in
          </p>

          <div className="w-full max-w-5xl rounded-xl border border-[#eaeaea] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white">
            <Image
              src="/Allocardmodelcard.png"
              alt="Allocard model card"
              width={1774}
              height={887}
              className="w-full h-auto"
              priority
            />
          </div>
        </section>

        {/* ── Value Strip ── */}
        <section className="border-y border-[#eaeaea] bg-[#fafafa]">
          <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {[
              "Zero Money Sent Upfront",
              "Instant 1-Click Revocation",
              "1-Click Google & Email Sign-In",
              "Automated AI Receipt Auditing",
              "Instant Global Settlements",
            ].map((label) => (
              <span key={label} className="text-xs font-semibold text-[#666] tracking-wide whitespace-nowrap">
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* ── Problem ── */}
        <section id="problem" className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">The Problem</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] leading-[1.1] text-[#111] mb-5">
                You only discover spend violations after your money is already gone.
              </h2>
              <p className="text-[#666] leading-relaxed text-sm">
                Traditional corporate cards from banks and fintech providers force you to choose between two bad options: handing employees broad credit lines or pre-funding cards with cash. In both cases, you lose custody, and rules are only enforced during end-of-month accounting audits.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 pt-1">
              {[
                {
                  title: "Prepaid cards bleed cash upfront",
                  body: "You have to transfer company funds into cards before employees can buy anything. That capital sits idle outside your control and cannot be deployed elsewhere.",
                },
                {
                  title: "Credit limits invite surprise overspends",
                  body: "Broad credit lines trust employees not to overspend. When an unauthorized charge or accidental renewal happens, you only find out when the credit card bill arrives weeks later.",
                },
                {
                  title: "External providers hold you hostage",
                  body: "Legacy card providers charge heavy foreign exchange spreads, take days to process international wires, and can freeze your corporate account at their discretion.",
                },
              ].map(({ title, body }) => (
                <div key={title} className="p-4 rounded-lg border border-[#eaeaea] bg-[#fafafa]">
                  <p className="text-sm font-semibold text-[#111] mb-1">{title}</p>
                  <p className="text-sm text-[#666] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="border-t border-[#eaeaea] bg-[#fafafa]">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">The Core Innovation</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-[#111] mb-4">
                Authorization, not disbursement.
              </h2>
              <p className="max-w-xl mx-auto text-sm text-[#666] leading-relaxed">
                Allocard completely changes how corporate funds move. Instead of sending money to an employee or card, your company keeps all funds in its primary corporate treasury. You simply grant authorized permissions that dictate exactly what can be bought, up to what amount, and on what schedule. Funds only leave your company account at the exact second a verified purchase occurs.
              </p>
            </div>

            <div className="max-w-4xl mx-auto mb-16">
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4 text-center">
                Complete spending controls, enforced automatically
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { title: "Lifetime Spending Limits", desc: "Set a hard ceiling on what an employee can spend over their tenure." },
                  { title: "Recurring Allowances", desc: "Automatically reset departmental budgets weekly, monthly, or quarterly." },
                  { title: "Per-Transaction Caps", desc: "Prevent any single checkout from exceeding approved policy limits." },
                  { title: "Approved Vendor Whitelists", desc: "Restrict spending authority exclusively to verified vendors and services." },
                  { title: "Instant Revocation", desc: "Freeze or cancel any spending permission with a single click. No phone calls to banks." },
                  { title: "Multi-Assistant Permissions", desc: "Delegate micro-budgets to automated AI assistants that purchase tools on your behalf." },
                ].map(({ title, desc }) => (
                  <div key={title} className="p-4 rounded-lg border border-[#eaeaea] bg-white">
                    <p className="text-sm font-semibold text-[#111] mb-1">{title}</p>
                    <p className="text-xs text-[#666] leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Spend Rails ── */}
        <section id="spend-rails" className="border-t border-[#eaeaea] bg-white">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">Universal Spending Rails</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-[#111] mb-4">
                Every way modern companies spend, unified in one system.
              </h2>
              <p className="max-w-lg mx-auto text-sm text-[#666] leading-relaxed">
                Whether paying a local vendor, reimbursing a lunch, paying an overseas contractor, or letting an AI assistant purchase cloud tools, Allocard covers every corporate spending workflow.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {[
                {
                  tag: "Instant AI Reimbursements",
                  pattern: "Employee snaps receipt · AI verifies · Instant payout",
                  title: "No more waiting weeks for expense reports.",
                  body: "Employees upload a photo of their out-of-pocket receipt. Built-in vision AI reads the merchant, totals, and line items, verifies them against your natural language company policy, and disburses the exact reimbursement in seconds.",
                  engine: "Powered by Alibaba Cloud Qwen Vision and Qwen 3.8 Max for instant policy reasoning.",
                },
                {
                  tag: "Global Contractor Invoices",
                  pattern: "Overseas invoice · Zero wire fees · Sub-second settlement",
                  title: "Pay global talent without $45 bank wire fees.",
                  body: "Settle contractor invoices across borders instantly using the Agora Digital Dollar (AUSD). Eliminates multi-day correspondent bank delays and expensive foreign transaction spreads.",
                  engine: "Settles in under one second with automated invoice item verification.",
                },
                {
                  tag: "Automated Purchasing Assistants",
                  pattern: "Scoped micro-budget · AI finds deal · Executes checkout",
                  title: "Let AI assistants find and buy tools for your team.",
                  body: "Employees can assign a small portion of their authorized budget to intelligent software assistants. For example, our DevOps Procurement Agent compares cloud infrastructure and dedicated RPC plans across providers and purchases the best plan autonomously within its exact cap.",
                  engine: "Safeguarded by mathematical limits: impossible for the assistant to spend beyond its ceiling.",
                },
                {
                  tag: "Direct Spend & Virtual Cards",
                  pattern: "Direct vendor checkout · Coming soon: Physical and virtual VISA cards",
                  title: "Settle invoices directly, anywhere cards are accepted.",
                  body: "Employees can pay approved vendors directly from their authorized balance with optional receipt verification. Coming soon to mainnet: virtual and physical corporate VISA cards powered by MercuryOS, allowing your team to swipe at any retail counter or online checkout globally.",
                  engine: "Direct authorized checkout with post-spend compliance verification.",
                },
              ].map(({ tag, pattern, title, body, engine }) => (
                <div key={tag} className="p-6 rounded-xl border border-[#eaeaea] bg-[#fafafa] flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="self-start text-xs font-semibold px-2.5 py-1 rounded-full border border-[#eaeaea] text-[#555] bg-white">
                      {tag}
                    </span>
                    <span className="text-xs text-[#999] mt-1">{pattern}</span>
                  </div>
                  <h3 className="text-base font-semibold text-[#111] leading-snug">{title}</h3>
                  <p className="text-sm text-[#666] leading-relaxed">{body}</p>
                  <div className="mt-auto pt-3 border-t border-[#eaeaea]">
                    <p className="text-xs text-[#888] leading-relaxed">
                      <span className="font-semibold text-[#555]">System: </span>{engine}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Delegation Canvas ── */}
        <section id="canvas" className="border-t border-[#eaeaea] bg-[#fafafa]">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">Real-Time Governance</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-[#111] mb-4">
                Your entire company spend flow, visual and live.
              </h2>
              <p className="max-w-lg mx-auto text-sm text-[#666] leading-relaxed">
                Forget rigid spreadsheets and fragmented accounting portals. Allocard provides a live visual canvas that maps every authorized dollar across your organization in real time.
              </p>
            </div>

            <div className="w-full rounded-xl border border-[#eaeaea] overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
              <div className="border-b border-[#eaeaea] bg-[#fafafa] px-4 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e0e0e0]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e0e0e0]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e0e0e0]" />
                </div>
                <span className="text-xs text-[#999] ml-2 font-medium">Allocard Visual Spending Canvas</span>
              </div>
              <Image
                src="/delegationCanvas.png"
                alt="Allocard delegation canvas"
                width={1200}
                height={600}
                className="w-full h-auto"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mt-6">
              {[
                { title: "Treasury at the Center", body: "See your primary corporate account balance and all active spending branches at a glance." },
                { title: "Team to Assistant Mapping", body: "Watch authorized allowances flow from your company to employees, and from employees to their automated purchasing assistants." },
                { title: "Cascading Safety", body: "Revoking an employee's permission instantly terminates every assistant and micro-budget attached to them in one click." },
              ].map(({ title, body }) => (
                <div key={title} className="p-4 rounded-lg border border-[#eaeaea] bg-white">
                  <p className="text-sm font-semibold text-[#111] mb-1">{title}</p>
                  <p className="text-sm text-[#666] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Enterprise Sovereignty ── */}
        <section id="sovereignty" className="border-t border-[#eaeaea] bg-white">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div>
                <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">Built In-House</p>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-[#111] mb-4">
                  An in-house financial system you truly own.
                </h2>
                <p className="text-sm text-[#666] leading-relaxed mb-4">
                  Allocard gives you the capabilities of a high-end corporate card provider without making you dependent on one. Everything is deployed directly on your company account with zero intermediaries.
                </p>
                <p className="text-sm text-[#666] leading-relaxed">
                  Your funds stay in your custody. Your rules remain under your exclusive control. You get the speed of modern automation with the safety of absolute ownership.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    title: "Zero Custody Risk",
                    body: "Allocard never holds your funds. Everything runs directly on your company's own smart account. We cannot freeze your balance or alter your rules.",
                  },
                  {
                    title: "Private & Non-Intrusive AI",
                    body: "Your internal company expense policies and receipts are evaluated privately with zero data retention using Alibaba Cloud Qwen AI.",
                  },
                  {
                    title: "Complete Transparent Audit Trail",
                    body: "Every single authorization, adjustment, and payment is permanently logged with tamper-proof mathematical certainty on Monad.",
                  },
                ].map(({ title, body }) => (
                  <div key={title} className="p-4 rounded-lg border border-[#eaeaea] bg-[#fafafa]">
                    <p className="text-sm font-semibold text-[#111] mb-1">{title}</p>
                    <p className="text-sm text-[#666] leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section id="cta" className="border-t border-[#eaeaea] bg-[#fafafa]">
          <div className="max-w-6xl mx-auto px-6 py-24 flex flex-col items-center text-center">
            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-5">
              Ready in two minutes · No hardware or bank setup needed
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-[1.05] max-w-xl text-[#111] mb-5">
              Take total control of your company spend today.
            </h2>
            <p className="text-sm text-[#666] max-w-md mb-10 leading-relaxed">
              Sign in with your Google account, create your company workspace, and issue your first spending permission in under sixty seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="closing-try-demo"
                onClick={handleConnect}
                disabled={isBusy}
                className="h-10 px-6 rounded-md bg-[#111] text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-40 cursor-pointer"
              >
                {buttonLabel}
              </button>
              <a
                id="closing-view-github"
                href="https://github.com/Stoneybro/Allocard"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-6 rounded-md border border-[#eaeaea] text-[#444] text-sm font-medium hover:border-[#ccc] hover:bg-white transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#eaeaea] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/AllocardLogoBlack.svg" alt="Allocard Logo" width={20} height={20} />
            <span className="text-sm font-semibold text-[#111]">Allocard</span>
          </div>
          <p className="text-xs text-[#999] text-center">
            Monad Metropolis Hackathon · Product & Consumer Track · Built on Monad with Agora Digital Dollar and Alibaba Cloud Qwen AI.
          </p>
          <a
            href="https://github.com/Stoneybro/Allocard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#999] hover:text-[#111] transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
