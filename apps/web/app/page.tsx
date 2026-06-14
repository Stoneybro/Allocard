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
            <a href="#features" className="text-sm text-[#666] hover:text-[#111] transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-[#666] hover:text-[#111] transition-colors">How it Works</a>
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
            Company funds stay in one smart account. Employees and agents spend through signed delegations. The contract enforces every limit. No funds move until every rule passes.
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

          {/* Model Card */}
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
            {[
              "MetaMask Smart Accounts",
              "ERC-7710 Redelegation",
              "ERC-4337 Account Abstraction",
              "Venice AI",
              "Base Sepolia",
            ].map((label) => (
              <span key={label} className="text-xs font-medium text-[#999] tracking-wide whitespace-nowrap">
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
                Corporate cards move money before violations are caught.
              </h2>
              <p className="text-[#666] leading-relaxed text-sm">
                Brex and Ramp enforce limits through a centralized provider. Violations are discovered in audits, after funds have moved. AI agents with funded wallets have no on-chain constraint at all.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 pt-1">
              {[
                {
                  title: "Audits are retroactive",
                  body: "Spending violations are found days after the transaction executes.",
                },
                {
                  title: "Agents can overspend by design",
                  body: "A funded wallet has no built-in limit. The agent decides how much to spend.",
                },
                {
                  title: "Controls live in the provider",
                  body: "Switch providers and your spending rules do not follow you.",
                },
              ].map(({ title, body }) => (
                <div key={title} className="p-4 rounded-lg border border-[#eaeaea] bg-white">
                  <p className="text-sm font-semibold text-[#111] mb-1">{title}</p>
                  <p className="text-sm text-[#666] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="border-t border-[#eaeaea] bg-[#fafafa]">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">What Allocard Does</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-[#111]">
                Every rule enforced at the contract level.
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-px bg-[#eaeaea] rounded-xl overflow-hidden border border-[#eaeaea]">
              {[
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  ),
                  label: "On-Chain Delegation",
                  body: "Delegations are signed objects with caveats. The Delegation Manager contract checks every caveat before any ETH moves.",
                },
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z" />
                    </svg>
                  ),
                  label: "Three AI Agents",
                  body: "Travel, Procurement, and Reimbursement agents each hold a smart account. Venice AI evaluates every request before execution.",
                },
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                    </svg>
                  ),
                  label: "Delegation Canvas",
                  body: "A React Flow graph shows the full delegation tree. Drag an employee or agent onto the canvas to start a new delegation.",
                },
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                  ),
                  label: "Cascading Revocation",
                  body: "Revoking a parent delegation revokes every child delegation in the subtree. One action cuts off an employee and all their agents.",
                },
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  ),
                  label: "Receipt OCR",
                  body: "Venice Vision scans receipt images and extracts merchant, amount, and date. The Reimbursement Agent uses this to verify claims.",
                },
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  ),
                  label: "Passwordless Auth",
                  body: "MetaMask Embedded Wallets handles sign-in. Every entity gets an ERC-4337 smart account. No seed phrases.",
                },
              ].map(({ icon, label, body }) => (
                <div key={label} className="p-6 bg-white flex flex-col gap-3 hover:bg-[#fafafa] transition-colors group">
                  <div className="w-8 h-8 rounded-lg border border-[#eaeaea] flex items-center justify-center text-[#555] group-hover:border-[#ccc] transition-colors">
                    {icon}
                  </div>
                  <p className="text-sm font-semibold text-[#111]">{label}</p>
                  <p className="text-sm text-[#666] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="border-t border-[#eaeaea]">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">How It Works</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-[#111]">
                From company account to agent execution.
              </h2>
            </div>

            <div className="max-w-3xl mx-auto rounded-xl border border-[#eaeaea] overflow-hidden mb-16">
              {[
                {
                  num: "01",
                  title: "Company deploys a Smart Account",
                  body: "All funds sit in one ERC-4337 account. Nothing is pre-loaded to employees or agents.",
                },
                {
                  num: "02",
                  title: "Employer signs a delegation",
                  body: "The delegation sets a lifetime cap, monthly allowance, per-transaction limit, and allowed addresses.",
                },
                {
                  num: "03",
                  title: "Employee redelegates to agents",
                  body: "Each agent gets a child delegation. Its budget is capped at the parent delegation's values.",
                },
                {
                  num: "04",
                  title: "Agent checks policy, then executes",
                  body: "Venice AI approves or rejects the request. If approved, the contract verifies the caveats and transfers ETH.",
                },
              ].map(({ num, title, body }, i) => (
                <div
                  key={num}
                  className={`flex gap-6 p-6 bg-white hover:bg-[#fafafa] transition-colors ${i !== 0 ? "border-t border-[#eaeaea]" : ""}`}
                >
                  <span className="text-xs font-bold text-[#ccc] font-mono mt-0.5 w-5 shrink-0">{num}</span>
                  <div>
                    <p className="text-sm font-semibold text-[#111] mb-1">{title}</p>
                    <p className="text-sm text-[#666] leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Canvas image */}
            <div className="w-full rounded-xl border border-[#eaeaea] overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
              <div className="border-b border-[#eaeaea] bg-[#fafafa] px-4 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e0e0e0]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e0e0e0]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e0e0e0]" />
                </div>
                <span className="text-xs text-[#999] ml-2 font-medium">Delegation Canvas</span>
              </div>
              <Image
                src="/delegationCanvas.png"
                alt="Allocard delegation canvas"
                width={1200}
                height={600}
                className="w-full h-auto"
              />
            </div>
          </div>
        </section>

        {/* ── Agents ── */}
        <section id="agents" className="border-t border-[#eaeaea] bg-[#fafafa]">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">Agent System</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-[#111]">
                Three agents cover the full expense workflow.
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  tag: "Travel Agent",
                  title: "Books flights and hotels within the delegation budget.",
                  body: "The employee redelegates a travel budget. The agent proposes an itinerary and executes on-chain payment on approval.",
                },
                {
                  tag: "Procurement Agent",
                  title: "Buys software subscriptions. Checks for duplicates first.",
                  body: "If the tool category is already covered, the agent flags it. Otherwise it compares vendors to the budget and purchases on approval.",
                },
                {
                  tag: "Reimbursement Agent",
                  title: "Pays employees back for out-of-pocket expenses.",
                  body: "The employee submits a description, amount, and receipt. Venice checks the claim. ETH transfers directly to their wallet if it passes.",
                },
              ].map(({ tag, title, body }) => (
                <div key={tag} className="p-6 rounded-xl border border-[#eaeaea] bg-white flex flex-col gap-4">
                  <span className="self-start text-xs font-semibold px-2.5 py-1 rounded-full border border-[#ddd] text-[#555] bg-[#fafafa]">
                    {tag}
                  </span>
                  <p className="text-sm font-semibold text-[#111] leading-snug">{title}</p>
                  <p className="text-sm text-[#666] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stack ── */}
        <section id="stack" className="border-t border-[#eaeaea]">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div>
                <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#999] mb-4">Tech Stack</p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-[#111] mb-3">
                  What it runs on.
                </h2>
                <p className="text-sm text-[#666] leading-relaxed">
                  Next.js 15, MetaMask Smart Accounts Kit, Venice AI, and Neon Postgres. Deployed on Vercel. Network is Base Sepolia.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Next.js 15 + React 19", sublabel: "Framework" },
                  { label: "MetaMask Smart Accounts", sublabel: "ERC-7710 / ERC-4337" },
                  { label: "Venice AI", sublabel: "Policy reasoning + OCR" },
                  { label: "Neon + Drizzle ORM", sublabel: "Database" },
                  { label: "React Flow", sublabel: "Delegation canvas" },
                  { label: "Base Sepolia", sublabel: "Network" },
                ].map(({ label, sublabel }) => (
                  <div key={label} className="p-4 rounded-lg border border-[#eaeaea] bg-[#fafafa]">
                    <p className="text-sm font-semibold text-[#111]">{label}</p>
                    <p className="text-xs text-[#999] mt-0.5">{sublabel}</p>
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
              Open demo. No setup.
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-[1.05] max-w-xl text-[#111] mb-5">
              See trustless corporate spending in action.
            </h2>
            <p className="text-sm text-[#666] max-w-sm mb-10 leading-relaxed">
              Connect a wallet. Create a company. Issue a delegation. The whole flow runs on Base Sepolia.
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
