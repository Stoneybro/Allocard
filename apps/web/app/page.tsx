"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getWalletProfile } from "@/app/actions/identity";
import { createSession } from "@/lib/session";
import Image from "next/image";

function routeForStatus(status: "new" | "employer" | "employee") {
  if (status === "employer") return "/employer";
  if (status === "employee") return "/employee";
  return "/onboarding";
}

export default function LandingPage() {
  const router = useRouter();
  const auth = useAuth();
  const [isRouting, startRouting] = useTransition();
  const didAutoRoute = useRef(false);

  // ── Auto-redirect if already authenticated ───────────────────────────────
  useEffect(() => {
    if (auth.status !== "authenticated" || didAutoRoute.current) return;
    didAutoRoute.current = true;

    startRouting(async () => {
      try {
        const profile = await getWalletProfile(auth.address);
        if (profile.status !== "new") {
          await createSession(auth.address);
        }
        router.replace(routeForStatus(profile.status));
      } catch {
        didAutoRoute.current = false;
      }
    });
  }, [auth, router]);

  // ── CTA handler ───────────────────────────────────────────────────────────
  const handleConnect = () => {
    if (auth.status === "authenticated") {
      startRouting(async () => {
        try {
          const profile = await getWalletProfile(auth.address);
          if (profile.status !== "new") {
            await createSession(auth.address);
          }
          router.push(routeForStatus(profile.status));
        } catch {
          // stay on landing page
        }
      });
      return;
    }
    if (auth.status === "unauthenticated") {
      auth.connect();
    }
    if (auth.status === "initializing") {
      const checkInterval = setInterval(() => {
        clearInterval(checkInterval);
      }, 500);
    }
  };

  const buttonLabel = (() => {
    if (auth.status === "error") return "Retry";
    if (isRouting) return "Loading...";
    if (auth.status === "unauthenticated" && auth.connecting) return "Connecting...";
    return "Try the Demo";
  })();

  const isBusy =
    (auth.status === "unauthenticated" && auth.connecting) || isRouting;

  return (
    <div className="min-h-screen bg-white text-[#111] font-sans antialiased overflow-y-auto">

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-[#eaeaea] bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#111]">
            <Image src="/AllocardLogoBlack.svg" alt="Allocard Logo" width={28} height={28} />
            Allocard
          </a>
          <div className="hidden md:flex items-center gap-6">
            <a href="#problem" className="text-sm text-[#666] hover:text-[#111] transition-colors">Problem</a>
            <a href="#how-it-works" className="text-sm text-[#666] hover:text-[#111] transition-colors">How it Works</a>
            <a href="#agents" className="text-sm text-[#666] hover:text-[#111] transition-colors">Agents</a>
            <a href="#canvas" className="text-sm text-[#666] hover:text-[#111] transition-colors">Canvas</a>
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

      <main className="pt-14">

        {/* ── Hero ── */}
        <section id="hero" className="max-w-6xl mx-auto px-6 pt-24 pb-16 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#eaeaea] bg-[#fafafa] mb-8">
            <span className="text-xs text-[#666] font-medium">MetaMask Hackathon 2026</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-[-0.04em] leading-[1] max-w-4xl mb-6 text-[#111]">
            Revolutionizing<br className="hidden sm:block" /> Corporate Expense Cards.
          </h1>

          <p className="max-w-lg text-base sm:text-lg text-[#666] leading-relaxed mb-10">
            One company smart account holds the funds. Employees get signed spending permissions. AI agents get scoped sub-permissions. The contract enforces every limit before any ETH moves.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-16">
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

          <div className="w-full max-w-5xl rounded-xl border border-[#eaeaea] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
            <Image
              src="/Allocardmodelcard.png"
              alt="Allocard model card"
              width={1200}
              height={525}
              className="w-full h-auto"
              priority
            />
          </div>
        </section>

        {/* ── Tech strip ── */}
        <section className="border-y border-[#eaeaea] bg-[#fafafa]">
          <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {["MetaMask Smart Accounts", "ERC-7710 Redelegation", "ERC-4337 Account Abstraction", "Venice AI", "Base Sepolia"].map((label) => (
              <span key={label} className="text-xs font-medium text-[#999] tracking-wide whitespace-nowrap">{label}</span>
            ))}
          </div>
        </section>

        {/* ── Problem ── */}
        <section id="problem" className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">The Problem</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] leading-[1.1] text-[#111] mb-5">
                Spend violations are found after the money is gone.
              </h2>
              <p className="text-[#666] leading-relaxed text-sm">
                Corporate cards pre-load funds. Employees and agents get access to more than any single transaction needs. Rules get checked in audits, days after the spend.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 pt-1">
              {[
                { title: "Funds are pre-loaded", body: "The employee has access to more money than any one purchase needs." },
                { title: "Agents have no built-in limits", body: "A funded AI wallet has no on-chain constraint. Nothing reverts an overspend." },
                { title: "Rules live in the provider", body: "The provider can change limits or be compromised. There is no proof the rules were followed." },
              ].map(({ title, body }) => (
                <div key={title} className="p-4 rounded-lg border border-[#eaeaea] bg-white">
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
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">How Allocard Works</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-[#111] mb-4">
                Delegation, not pre-loading.
              </h2>
              <p className="max-w-lg mx-auto text-sm text-[#666] leading-relaxed">
                The company keeps the funds. Employees receive a signed permission to spend up to defined limits. That permission is checked by the contract on every transaction. Nothing moves until every caveat passes.
              </p>
            </div>

            <div className="max-w-3xl mx-auto mb-16">
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4 text-center">Every corporate card feature, enforced on-chain</p>
              <div className="rounded-xl border border-[#eaeaea] overflow-hidden">
                {[
                  { feature: "Per-user spending limit", impl: "nativeTokenTransferAmount — lifetime ETH cap" },
                  { feature: "Monthly allowance reset", impl: "nativeTokenPeriodTransfer — resets on a schedule" },
                  { feature: "Per-transaction cap", impl: "valueLte — maximum ETH per transaction" },
                  { feature: "Merchant restrictions", impl: "allowedTargets — whitelist of recipient addresses" },
                  { feature: "Card cancellation", impl: "Delegation revocation — instant, cascades to sub-delegations" },
                  { feature: "Virtual cards for agents", impl: "Agent delegations — scoped and revocable" },
                ].map(({ feature, impl }, i) => (
                  <div key={feature} className={`grid grid-cols-2 gap-4 px-5 py-3.5 bg-white hover:bg-[#fafafa] transition-colors ${i !== 0 ? "border-t border-[#eaeaea]" : ""}`}>
                    <p className="text-sm text-[#555]">{feature}</p>
                    <p className="text-xs font-medium text-[#111] font-mono leading-relaxed">{impl}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-5 text-center">Three spending modes using ERC-7710</p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  mode: "Pattern 1",
                  title: "Company → Employee → Agent",
                  subtitle: "Redelegation. Agent executes.",
                  body: "The employee redelegates a portion of their budget to an agent. The agent executes independently within its scoped limits.",
                },
                {
                  mode: "Pattern 2",
                  title: "Company → Agent → Employee",
                  subtitle: "Agent pays the employee.",
                  body: "The company delegates a reimbursement budget to the agent. The agent pays the employee directly on approved claims.",
                },
                {
                  mode: "Pattern 3",
                  title: "Company → Employee (direct)",
                  subtitle: "Employee redeems directly.",
                  body: "The employee spends from their delegation to pay a merchant. Venice checks the purpose before the transaction executes.",
                },
              ].map(({ mode, title, subtitle, body }) => (
                <div key={mode} className="p-6 rounded-xl border border-[#eaeaea] bg-white flex flex-col gap-3">
                  <span className="self-start text-xs font-semibold px-2.5 py-1 rounded-full border border-[#ddd] text-[#555] bg-[#fafafa]">{mode}</span>
                  <div>
                    <p className="text-sm font-semibold text-[#111] leading-snug">{title}</p>
                    <p className="text-xs text-[#999] mt-0.5">{subtitle}</p>
                  </div>
                  <p className="text-sm text-[#666] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Venice AI ── */}
        <section id="venice" className="border-t border-[#eaeaea]">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="grid md:grid-cols-2 gap-16 items-start">
              <div>
                <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">Venice AI</p>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] leading-[1.1] text-[#111] mb-5">
                  Policy enforcement before every transaction.
                </h2>
                <p className="text-[#666] leading-relaxed text-sm mb-4">
                  Every agent request passes through Venice before execution. Venice reads on-chain caveats, the company&apos;s expense policy, and delegation-specific rules together, then returns a pass or reject decision with reasoning.
                </p>
                <p className="text-[#666] leading-relaxed text-sm">
                  Venice and the contract check independently. Neither can override the other. Venice does not retain data between requests.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-1">Three-layer policy context</p>
                {[
                  { layer: "Layer 1", title: "On-chain caveats", body: "Hard numeric limits from the delegation: lifetime cap, allowance, per-transaction max, allowed addresses." },
                  { layer: "Layer 2", title: "Company expense policy", body: "Natural language rules the employer sets. Applied to every agent request across the company." },
                  { layer: "Layer 3", title: "Per-delegation rules", body: "Agent-specific additions set when the employee creates the delegation." },
                ].map(({ layer, title, body }) => (
                  <div key={layer} className="p-4 rounded-lg border border-[#eaeaea] bg-[#fafafa]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-[#ccc] font-mono">{layer}</span>
                      <p className="text-sm font-semibold text-[#111]">{title}</p>
                    </div>
                    <p className="text-sm text-[#666] leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Agents ── */}
        <section id="agents" className="border-t border-[#eaeaea] bg-[#fafafa]">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">Agent System</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-[#111] mb-4">
                Three agents. Every expense workflow covered.
              </h2>
              <p className="max-w-md mx-auto text-sm text-[#666] leading-relaxed">
                Each agent holds a smart account, receives a scoped delegation, and executes on-chain. No human approves individual transactions.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  tag: "Travel Agent",
                  pattern: "Employee redelegates → Agent executes",
                  title: "Books travel within the delegated budget.",
                  body: "Submit a destination and dates. Venice proposes an itinerary within the caveat limits. Approve, and the agent pays.",
                  venice: "Reads the request, caveat limits, and policy. Returns an itinerary with estimated ETH cost.",
                },
                {
                  tag: "Procurement Agent",
                  pattern: "Employee redelegates → Agent executes",
                  title: "Buys software. Checks for duplicates first.",
                  body: "Submit a tool category and team size. Venice checks existing subscriptions, picks a vendor, and executes on approval.",
                  venice: "Checks existing tools for overlap, compares vendors against the delegation limit.",
                },
                {
                  tag: "Reimbursement Agent",
                  pattern: "Company delegates → Agent pays employee",
                  title: "Pays employees back for out-of-pocket expenses.",
                  body: "Submit a description, amount, and optional receipt. Venice checks the claim. ETH transfers to the employee's wallet if it passes.",
                  venice: "Vision model reads the receipt. Text model checks the claim against company policy.",
                },
              ].map(({ tag, pattern, title, body, venice }) => (
                <div key={tag} className="p-6 rounded-xl border border-[#eaeaea] bg-white flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="self-start text-xs font-semibold px-2.5 py-1 rounded-full border border-[#ddd] text-[#555] bg-[#fafafa]">{tag}</span>
                    <span className="text-xs text-[#bbb] font-mono mt-1">{pattern}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#111] leading-snug">{title}</p>
                  <p className="text-sm text-[#666] leading-relaxed">{body}</p>
                  <div className="mt-auto pt-3 border-t border-[#f0f0f0]">
                    <p className="text-xs text-[#999] leading-relaxed">
                      <span className="font-semibold text-[#bbb]">Venice: </span>{venice}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Delegation Canvas ── */}
        <section id="canvas" className="border-t border-[#eaeaea]">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">Delegation Canvas</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-[#111] mb-4">
                The full spending authority tree, at a glance.
              </h2>
              <p className="max-w-md mx-auto text-sm text-[#666] leading-relaxed">
                Every delegation renders as a node. Company is the root. Employees branch from it. Agent redelegations branch from employees. Revoking any node revokes its entire subtree.
              </p>
            </div>
            <div className="w-full rounded-xl border border-[#eaeaea] overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
              <div className="border-b border-[#eaeaea] bg-[#fafafa] px-4 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e0e0e0]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e0e0e0]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e0e0e0]" />
                </div>
                <span className="text-xs text-[#999] ml-2 font-medium">Delegation Canvas — Company delegation tree</span>
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
                { title: "Employer view", body: "Drag employees onto the canvas to issue a delegation. Configure caveats or revoke from the node." },
                { title: "Employee view", body: "See your inbound delegation and every agent you have redelegated to. Open each agent's drawer from the canvas." },
                { title: "Cascading revocation", body: "Revoking an employee node revokes every agent below it. One action, full subtree." },
              ].map(({ title, body }) => (
                <div key={title} className="p-4 rounded-lg border border-[#eaeaea] bg-[#fafafa]">
                  <p className="text-sm font-semibold text-[#111] mb-1">{title}</p>
                  <p className="text-sm text-[#666] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stack ── */}
        <section id="stack" className="border-t border-[#eaeaea] bg-[#fafafa]">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div>
                <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">Tech Stack</p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-[#111] mb-3">What it runs on.</h2>
                <p className="text-sm text-[#666] leading-relaxed">
                  Next.js 15, MetaMask Smart Accounts Kit, Venice AI, and Neon Postgres. Deployed on Vercel. Network is Base Sepolia.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Next.js 15 + React 19", sublabel: "Framework" },
                  { label: "MetaMask Smart Accounts", sublabel: "ERC-7710 / ERC-4337" },
                  { label: "Venice AI", sublabel: "openai-gpt-4o-2024-11-20" },
                  { label: "Neon + Drizzle ORM", sublabel: "Database" },
                  { label: "React Flow", sublabel: "Delegation canvas" },
                  { label: "Base Sepolia", sublabel: "Network" },
                ].map(({ label, sublabel }) => (
                  <div key={label} className="p-4 rounded-lg border border-[#eaeaea] bg-white">
                    <p className="text-sm font-semibold text-[#111]">{label}</p>
                    <p className="text-xs text-[#999] mt-0.5">{sublabel}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section id="cta" className="border-t border-[#eaeaea]">
          <div className="max-w-6xl mx-auto px-6 py-24 flex flex-col items-center text-center">
            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-5">Open demo. No setup required.</p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-[1.05] max-w-xl text-[#111] mb-5">
              See it run on Base Sepolia.
            </h2>
            <p className="text-sm text-[#666] max-w-sm mb-10 leading-relaxed">
              Connect a wallet. Issue a delegation. Redelegate to an agent. Watch ETH move under contract-enforced rules.
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
                className="h-10 px-6 rounded-md border border-[#eaeaea] text-[#444] text-sm font-medium hover:border-[#ccc] hover:bg-[#fafafa] transition-colors flex items-center justify-center gap-2"
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
      <footer className="border-t border-[#eaeaea]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/AllocardLogoBlack.svg" alt="Allocard Logo" width={20} height={20} />
            <span className="text-sm font-semibold text-[#111]">Allocard</span>
          </div>
          <p className="text-xs text-[#999] text-center">
            MetaMask Smart Accounts Kit x 1Shot API Hackathon. Base Sepolia. ERC-7710 and ERC-4337.
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
