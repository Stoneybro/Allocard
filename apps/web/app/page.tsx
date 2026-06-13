"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getWalletProfile } from "@/app/actions/identity";

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
          router.push(routeForStatus(profile.status));
        } catch {
          // stay on landing page
        }
      });
      return;
    }
    // For both "initializing" and "unauthenticated", call connect.
    // Web3Auth will show the modal when it's ready.
    if (auth.status === "unauthenticated") {
      auth.connect();
    }
    // If "initializing", the connect() from the provider is not available yet.
    // The user can click again once init completes, or we can show a brief toast.
    // For now: the button shows "Try the Demo" and the Web3Auth modal will
    // pop up when init finishes. The user can also wait.
    if (auth.status === "initializing") {
      // Poll: wait for init to finish, then connect
      const checkInterval = setInterval(() => {
        // We can't reliably poll here with the hook; simplest: just let user
        // click again. The button stays enabled and says "Try the Demo".
        clearInterval(checkInterval);
      }, 500);
    }
  };

  // ── Button label ──────────────────────────────────────────────────────────
  // The landing page CTA is NEVER disabled for "initializing" — that's the
  // whole point. Only show "Connecting..." when the connect modal is open.
  // For error state, show "Retry".
  const buttonLabel = (() => {
    if (auth.status === "error") return "Retry";
    if (isRouting) return "Loading...";
    // When connecting (modal is open), show "Connecting..."
    if (auth.status === "unauthenticated" && auth.connecting) return "Connecting...";
    return "Try the Demo";
  })();

  const isBusy =
    (auth.status === "unauthenticated" && auth.connecting) ||
    isRouting;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased overflow-y-auto">

      {/* ── Top Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#" className="text-lg font-bold tracking-tighter">
            Allocard
          </a>
          <div className="flex items-center gap-3">
            <a
              href="#"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Read the Docs
            </a>
            <button
              id="nav-cta"
              onClick={handleConnect}
              disabled={isBusy}
              className="h-9 px-5 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 cursor-pointer"
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-16">

        {/* ── Section 1: Hero ── */}
        <section
          id="hero"
          className="max-w-6xl mx-auto px-6 pt-28 pb-24 flex flex-col items-center text-center"
        >
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-6">
            MetaMask Hackathon 2025
          </p>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-[-0.04em] leading-[0.95] max-w-4xl mb-8">
            Revolutionizing Corporate Expense Cards.
          </h1>
          <p className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed mb-12">
            Give employees, external contractors, and AI agents the exact spending permissions they need, without ever
            transferring company funds. Allocard utilizes MetaMask Smart Accounts to let you delegate, redelegate, and
            visually monitor trustless spending authority across your entire organization.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-20">
            <button
              id="hero-try-demo"
              onClick={handleConnect}
              disabled={isBusy}
              className="h-12 px-8 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 cursor-pointer"
            >
              {buttonLabel}
            </button>
            <a
              id="hero-read-docs"
              href="#"
              className="h-12 px-8 rounded-full border border-border text-foreground text-sm font-semibold hover:bg-muted transition-colors flex items-center justify-center"
            >
              Read the Docs
            </a>
          </div>

          {/* Illustration Placeholder — Section 1 */}
          <div
            aria-label="Hero illustration placeholder"
            className="w-full max-w-4xl aspect-[16/7] rounded-2xl border border-border bg-muted/30 flex flex-col items-center justify-center gap-3 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-muted/60 via-transparent to-transparent" />
            <div className="relative flex flex-col items-center gap-2 text-muted-foreground">
              <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
              </svg>
              <span className="text-xs font-medium">Dashboard illustration</span>
            </div>
          </div>
        </section>

        {/* ── Section 2: How It Works ── */}
        <section id="how-it-works" className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-28">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-center mb-16">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Create Company",
                  body: "Set up your company on Allocard and deploy a MetaMask Smart Account that holds funds.",
                },
                {
                  step: "2",
                  title: "Delegate Spending",
                  body: "Issue on-chain delegations to employees and AI agents with fine-grained spending limits.",
                },
                {
                  step: "3",
                  title: "Trust & Monitor",
                  body: "Employees and agents can spend within their limits. Every transaction is enforced on-chain.",
                },
              ].map(({ step, title, body }) => (
                <div key={step} className="flex flex-col items-center text-center p-6">
                  <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center text-lg font-bold mb-4">
                    {step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 3: Features ── */}
        <section id="features" className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-28">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-center mb-16">
              Key Features
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  label: "Permissionless Delegation",
                  body: "Company owners can delegate spending authority to employees and AI agents with ERC-7710 compliant on-chain caveats.",
                },
                {
                  label: "AI Agent Integration",
                  body: "Platform agents (Reimbursement, Travel, Procurement) operate with their own Smart Accounts and receive redelegated authority.",
                },
                {
                  label: "Visual Delegation Canvas",
                  body: "A drag-and-drop canvas shows the full delegation tree — company → employee → agent — with real-time status.",
                },
                {
                  label: "On-Chain Enforcement",
                  body: "All spending limits are enforced by smart contracts. No off-chain trust required.",
                },
              ].map(({ label, body }) => (
                <div key={label} className="p-6 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <h3 className="text-base font-semibold mb-2">{label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 4: Architecture ── */}
        <section id="architecture" className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-28">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-center mb-16">
              Architecture
            </h2>
            <div className="max-w-3xl mx-auto">
              <div className="rounded-lg border border-border">
                {[
                  {
                    label: "Zero Traditional Auth",
                    body: "Fully passwordless onboarding via MetaMask Embedded Wallets.",
                  },
                  {
                    label: "Smart Accounts by Default",
                    body: "Every company, employee, and AI agent operates an ERC-4337 Smart Account, which is required to act as a delegator in the network.",
                  },
                  {
                    label: "On-Chain Caveat Enforcers",
                    body: "Limits (nativeTokenTransferAmount, valueLte, allowedTargets) are evaluated and enforced on-chain by the Delegation Manager contract before any transaction executes.",
                  },
                  {
                    label: "Polymorphic Architecture",
                    body: "A custom Drizzle and PostgreSQL schema elegantly tracks infinite depths of delegations and redelegations on the backend.",
                  },
                ].map(({ label, body }, i) => (
                  <div
                    key={label}
                    className={`flex flex-col sm:flex-row gap-4 p-6 bg-background hover:bg-muted/30 transition-colors ${i === 0 ? "" : "border-t border-border"}`}
                  >
                    <div className="sm:w-48 shrink-0">
                      <span className="text-sm font-semibold">{label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 5: Closing ── */}
        <section
          id="closing"
          className="border-t border-border"
        >
          <div className="max-w-6xl mx-auto px-6 py-28 flex flex-col items-center text-center">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-6">
              Built for the MetaMask Hackathon
            </p>
            <h2 className="text-4xl sm:text-6xl font-bold tracking-[-0.03em] leading-[1.05] max-w-3xl mb-8">
              Explore the future of trustless corporate spending.
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <button
                id="closing-try-demo"
                onClick={handleConnect}
                disabled={isBusy}
                className="h-12 px-8 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 cursor-pointer"
              >
                {buttonLabel}
              </button>
              <a
                id="closing-view-github"
                href="https://github.com/Stoneybro/Allocard"
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 px-8 rounded-full border border-border text-foreground text-sm font-semibold hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
                </svg>
                View GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-bold tracking-tighter">Allocard</span>
          <p className="text-xs text-muted-foreground text-center">
            Built for the MetaMask Hackathon · Trustless corporate spending powered by ERC-7710 &amp; ERC-4337.
          </p>
          <a
            href="https://github.com/Stoneybro/Allocard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
