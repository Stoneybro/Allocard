"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useLogin } from "@privy-io/react-auth";
import { getWalletProfile } from "@/app/actions/identity";
import { ArrowRight, Loader2 } from "lucide-react";
import Image from "next/image";

function routeForStatus(status?: "new" | "picker" | "employer" | "employee" | null) {
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
  const [phase, setPhase] = useState<"idle" | "signing_in" | "routing">("idle");
  const [activeTarget, setActiveTarget] = useState<"nav" | "hero">("hero");
  const isFreshSignInRef = useRef(false);
  const pendingClickRef = useRef(false);
  const isNavigatingRef = useRef(false);

  const isAuthenticated = Boolean(
    initialWalletAddress || auth.status === "authenticated"
  );

  // Prefetch dashboard routes so assets are immediately available in browser cache
  useEffect(() => {
    router.prefetch("/employer");
    router.prefetch("/employee");
    router.prefetch("/onboarding");
  }, [router]);

  // Clean any legacy sessionStorage keys
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("allocard_user_logging_in");
    }
  }, []);

  const navigateToDashboard = useCallback(
    (target: "nav" | "hero" = "hero") => {
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;
      setActiveTarget(target);
      setPhase("routing");

      // Fast-path: if initialProfileStatus was already verified by server, navigate immediately!
      if (initialProfileStatus) {
        const destination = routeForStatus(initialProfileStatus);
        window.location.assign(destination);
        return;
      }

      // Dynamic path for fresh logins or newly created accounts
      void (async () => {
        try {
          const address = auth.status === "authenticated" ? auth.address : initialWalletAddress;
          if (auth.status === "authenticated") {
            await auth.establishSession();
          }
          if (address) {
            const profile = await getWalletProfile(address);
            const destination = routeForStatus(profile.status);
            window.location.assign(destination);
            return;
          }
        } catch (err) {
          console.warn("Dashboard routing error, falling back to onboarding:", err);
        }
        window.location.assign("/onboarding");
      })();
    },
    [auth, initialWalletAddress, initialProfileStatus]
  );

  const { login } = useLogin({
    onComplete: () => {
      // Fresh sign-in successfully completed in Privy
      isFreshSignInRef.current = true;
      if (auth.status === "authenticated") {
        navigateToDashboard(activeTarget);
      }
    },
    onError: () => {
      isFreshSignInRef.current = false;
      pendingClickRef.current = false;
      isNavigatingRef.current = false;
      setPhase("idle");
    },
  });

  // Automatically route only when a user actively performs a fresh login.
  // Existing users simply viewing or refreshing the landing page NEVER auto-route.
  useEffect(() => {
    if (!isFreshSignInRef.current) return;

    if (auth.status === "authenticated") {
      navigateToDashboard(activeTarget);
    } else if (auth.status === "unauthenticated" && pendingClickRef.current) {
      pendingClickRef.current = false;
      login();
    }
  }, [auth.status, activeTarget, login, navigateToDashboard]);

  const handleConnect = (target: "nav" | "hero" = "hero") => {
    if (phase !== "idle") return;

    if (isAuthenticated) {
      navigateToDashboard(target);
      return;
    }

    isFreshSignInRef.current = true;
    setActiveTarget(target);
    setPhase("signing_in");

    if (auth.status === "unauthenticated") {
      login();
      return;
    }

    if (auth.status === "connecting") {
      pendingClickRef.current = true;
    }
  };

  const isBusy = phase !== "idle";

  const renderNavButtonContent = () => {
    if (phase === "routing" && activeTarget === "nav") {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="size-3.5 animate-spin" />
          <span>Opening…</span>
        </span>
      );
    }
    if (phase === "signing_in" && activeTarget === "nav") {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="size-3.5 animate-spin" />
          <span>Signing in…</span>
        </span>
      );
    }
    if (isAuthenticated) {
      return <span>Dashboard</span>;
    }
    return <span>Sign in</span>;
  };

  const renderHeroButtonContent = () => {
    if (phase === "routing") {
      return (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin text-white" />
          <span>Going to dashboard…</span>
        </span>
      );
    }
    if (phase === "signing_in") {
      return (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin text-white" />
          <span>Signing in…</span>
        </span>
      );
    }
    if (isAuthenticated) {
      return (
        <span className="inline-flex items-center justify-center gap-2">
          <span>Go to Dashboard</span>
          <ArrowRight className="size-4" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center gap-2">
        <span>Get Started</span>
        <ArrowRight className="size-4" />
      </span>
    );
  };

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
            onClick={() => handleConnect("nav")}
            disabled={isBusy}
            className={`h-8 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer ${
              isAuthenticated
                ? "bg-[#111] text-white hover:bg-[#333]"
                : "border border-[#eaeaea] bg-white text-[#111] hover:bg-[#f7f7f7] hover:border-[#ccc]"
            }`}
          >
            {renderNavButtonContent()}
          </button>
        </div>
      </nav>

      <main id="main" className="pt-14">

        {/* ── Hero ── */}
        <section id="hero" className="max-w-6xl mx-auto px-6 pt-24 pb-16 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#eaeaea] bg-[#fafafa] mb-8">
            <span className="text-xs text-[#666] font-medium">Monad Metropolis · Product & Consumer Track</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-[-0.04em] leading-[1.05] max-w-4xl mb-6 text-[#111]">
            The corporate expense system<br className="hidden sm:block" /> for teams and autonomous AI.
          </h1>

          <p className="max-w-xl text-base sm:text-lg text-[#666] leading-relaxed mb-10">
            Give employees and AI agents permission to spend within rules you control. No shared cards, no pre-funded wallets, and no paperwork.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              id="hero-try-demo"
              onClick={() => handleConnect("hero")}
              disabled={isBusy}
              className="h-10 px-6 rounded-md bg-[#111] text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-60 cursor-pointer shadow-xs min-w-[170px]"
            >
              {renderHeroButtonContent()}
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
            No seed phrases · 1-click Google or email sign-in · Gasless on Monad
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
                Giving employees and AI agents cards or pre-funded wallets puts your capital at risk.
              </h2>
              <p className="text-[#666] leading-relaxed text-sm">
                Traditional setups force you to hand out shared credit cards or transfer funds directly into employee wallets. Both models give up custody of company capital before anything is even purchased.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 pt-1">
              {[
                {
                  title: "Shared cards lead to runaway charges",
                  body: "Broad credit limits rely on trust. Forgotten subscriptions and unapproved charges only surface weeks later during end-of-month reviews.",
                },
                {
                  title: "Upfront transfers lose treasury custody",
                  body: "Sending tokens directly to employee wallets puts company capital at risk. If a private key leaks or money is misspent, the funds are already gone.",
                },
                {
                  title: "AI agents cannot safely hold funds",
                  body: "Giving an autonomous bot an open credit card or pre-funded wallet is dangerous. One loop or bad prompt can drain your account.",
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
                Permissions under rules, not money transfers.
              </h2>
              <p className="max-w-xl mx-auto text-sm text-[#666] leading-relaxed">
                Instead of sending funds to an employee or card, your capital stays 100% in your company treasury. You grant cryptographic permissions that define exactly what can be bought, up to what cap, and on what schedule. Funds only leave your treasury when a valid transaction matches your rules.
              </p>
            </div>

            <div className="max-w-4xl mx-auto mb-16">
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4 text-center">
                Spending rules enforced onchain
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { title: "Hard Spending Caps", desc: "Set strict lifetime or monthly budget limits that cannot be exceeded." },
                  { title: "Rolling Periodic Budgets", desc: "Reset team allowances automatically weekly or monthly with zero manual top-ups." },
                  { title: "Per-Transaction Caps", desc: "Prevent any single checkout from exceeding approved policy limits." },
                  { title: "Approved Vendor Whitelists", desc: "Restrict spending authority exclusively to verified vendor contracts or addresses." },
                  { title: "Instant 1-Click Revocation", desc: "Cancel or freeze any spending permission instantly with zero stranded cash." },
                  { title: "AI Agent Sub-Delegations", desc: "Empower autonomous software agents to buy tools within strict mathematical caps." },
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
                Every way modern companies spend, unified.
              </h2>
              <p className="max-w-lg mx-auto text-sm text-[#666] leading-relaxed">
                One company treasury powers direct vendor payments, instant expense reimbursements, overseas contractor payouts, and autonomous AI procurement.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {[
                {
                  tag: "Direct Spend",
                  pattern: "Direct vendor payment · Gasless via Pimlico · Sub-second Monad",
                  title: "Pay vendors directly from company treasury.",
                  body: "Employees execute direct business payments within their delegated cap. The exact amount settles in under one second on Monad directly from the company account.",
                  engine: "Submits as an ERC-4337 UserOperation with zero gas fees for employees.",
                },
                {
                  tag: "Instant AI Reimbursements",
                  pattern: "Snap receipt · Vision AI extracts items · Instant payout",
                  title: "No more waiting weeks for expense reports.",
                  body: "Employees upload a photo of an out-of-pocket receipt. Vision AI reads the merchant, date, and items, validates policy compliance, and settles the claim in seconds.",
                  engine: "Powered by Alibaba Cloud Qwen 2.5 VL with automated natural-language policy matching.",
                },
                {
                  tag: "Global Remittances",
                  pattern: "Overseas invoices · Live mid-market FX · Zero wire fees",
                  title: "Pay global talent without $45 bank wire fees.",
                  body: "Settle international invoices instantly using Agora Digital Dollar (AUSD). Eliminates multi-day correspondent bank delays and expensive foreign exchange spreads.",
                  engine: "Settles on Monad in sub-second finality with live multi-currency conversion.",
                },
                {
                  tag: "Cloud & Tooling Agent",
                  pattern: "Scoped micro-budget · AI scours plans · Autonomous procurement",
                  title: "Autonomous tool procurement for your team.",
                  body: "Employees assign a portion of their authorized budget to our Cloud & Tooling Agent to compare and purchase developer infrastructure across Monad ecosystem partners.",
                  engine: "Cryptographically bound to its cap: impossible for the agent to overspend.",
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
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">Visual Spend Map</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-[#111] mb-4">
                Your entire company spend, live on canvas.
              </h2>
              <p className="max-w-lg mx-auto text-sm text-[#666] leading-relaxed">
                Replace rigid spreadsheets with an interactive visual tree showing your company treasury, active employee allowances, and AI agent delegations in real time.
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
                { title: "Central Treasury", body: "View your company balance and every active spending authorization in one central map." },
                { title: "Composable Permissions", body: "Allowances flow from company to employees, and from employees to their AI assistants." },
                { title: "Instant Cascading Revocation", body: "Revoking an employee instantly terminates all child budgets and agent permissions attached to them." },
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
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">Complete Ownership</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-[#111] mb-4">
                A corporate spend system you truly own.
              </h2>
              <p className="text-sm text-[#666] leading-relaxed mb-4">
                Allocard delivers the power of modern corporate cards without handing custody to third parties. Your smart account runs directly on Monad with zero intermediaries.
              </p>
              <p className="text-sm text-[#666] leading-relaxed">
                Your funds stay in your custody. Your rules remain under your control. You get the speed of modern automation with the safety of cryptographic guarantees.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  title: "Zero Custody Risk",
                  body: "Allocard never holds your funds. Everything runs on your company smart account. We cannot freeze your balance or alter your rules.",
                },
                {
                  title: "Private Policy AI",
                  body: "Company expense policies and receipts are evaluated privately with zero data retention using Alibaba Cloud Qwen AI.",
                },
                {
                  title: "Tamper-Proof Audit Trail",
                  body: "Every authorization, budget adjustment, and payment is permanently logged and verifiable on Monad.",
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
              Ready in two minutes · No seed phrases · No gas tokens needed
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-[1.05] max-w-xl text-[#111] mb-5">
              Take total control of your company spend today.
            </h2>
            <p className="text-sm text-[#666] max-w-md mb-10 leading-relaxed">
              Sign in with your Google account, activate your company smart account, and issue your first spending permission in under sixty seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="closing-try-demo"
                onClick={() => handleConnect("hero")}
                disabled={isBusy}
                className="h-10 px-6 rounded-md bg-[#111] text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-60 cursor-pointer shadow-xs min-w-[170px]"
              >
                {renderHeroButtonContent()}
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
