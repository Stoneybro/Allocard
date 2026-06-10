"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useWeb3AuthConnect } from "@web3auth/modal/react";
import { useAccount } from "wagmi";
import { getWalletProfile } from "@/app/actions/identity";

function routeForStatus(status: "new" | "employer" | "employee") {
  if (status === "employer") return "/employer";
  if (status === "employee") return "/employee";
  return "/onboarding";
}

export default function LandingPage() {
  const router = useRouter();
  const { connect, loading, isConnected } = useWeb3AuthConnect();
  const { address } = useAccount();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRouting, startRouting] = useTransition();

  useEffect(() => {
    if (!isConnecting || !isConnected || !address) return;
    startRouting(async () => {
      const profile = await getWalletProfile(address);
      router.push(routeForStatus(profile.status));
    });
  }, [address, isConnected, isConnecting, router]);

  const handleConnect = () => {
    if (isConnected && address) {
      startRouting(async () => {
        const profile = await getWalletProfile(address);
        router.push(routeForStatus(profile.status));
      });
      return;
    }
    setIsConnecting(true);
    connect();
  };

  const isBusy = (loading && isConnecting) || isRouting;

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
              {isBusy ? "Loading..." : "Try the Demo"}
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
              {isBusy ? "Loading..." : "Try the Demo"}
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
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                <svg className="w-5 h-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </div>
              <span className="text-xs font-medium tracking-wide uppercase opacity-50">Illustration — Coming Soon</span>
            </div>
          </div>
        </section>

        {/* ── Section 2: Minimizing Trust ── */}
        <section
          id="trust"
          className="border-t border-border"
        >
          <div className="max-w-6xl mx-auto px-6 py-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
              <div className="lg:col-span-4">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-4">
                  How It Works
                </p>
                <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-[1.05]">
                  Minimizing Trust with MetaMask Delegation
                </h2>
              </div>
              <div className="lg:col-span-8">
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8">
                  The traditional corporate card model is broken: you issue funds to an employee and rely on company
                  policy to prevent misuse. Allocard completely removes the need for trust.
                </p>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Instead of moving money, your capital remains securely in a central company Smart Account. You issue an
                  on-chain delegation — a smart contract permission that allows an employee or AI agent to spend directly
                  from the company account. Every delegation is bound by strict on-chain rules (caveats), such as maximum
                  transaction values or allowed contract addresses. If a purchase violates the caveats, the transaction
                  fails. The funds never leave your account until a valid transaction is executed.
                </p>

                <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    {
                      label: "Capital stays put",
                      body: "Funds remain in the company Smart Account — never pre-loaded onto a card.",
                    },
                    {
                      label: "On-chain caveats",
                      body: "Rules like spending caps and allowed addresses are enforced by the Delegation Manager contract.",
                    },
                    {
                      label: "Zero policy reliance",
                      body: "Invalid transactions are rejected at the protocol level, not after the fact.",
                    },
                  ].map(({ label, body }) => (
                    <div
                      key={label}
                      className="border border-border rounded-xl p-5 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground mb-4" />
                      <h3 className="text-sm font-semibold mb-2">{label}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 3: The Delegation Canvas ── */}
        <section
          id="canvas"
          className="border-t border-border bg-muted/10"
        >
          <div className="max-w-6xl mx-auto px-6 py-28">
            <div className="max-w-3xl mb-16">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-4">
                Visual Control Center
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-[1.05] mb-6">
                The Delegation Canvas
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Managing complex on-chain permissions shouldn&apos;t require writing code. We turned the ERC-7710 delegation
                standard into a premium, intuitive drag-and-drop experience.
              </p>
            </div>

            <p className="text-muted-foreground leading-relaxed max-w-2xl mb-16">
              The Canvas serves as the visual control center for your company&apos;s entire spending tree. From your Master
              Card, you can map out every financial relationship in the company. Drag an employee or AI agent onto the
              board to grant authority, and click their node to configure spending caps and rules. You can monitor every
              active delegation in real-time. If an employee leaves or a project ends, revoking their access takes one
              click — instantly severing their permission and automatically invalidating all redelegations downstream.
            </p>

            {/* Illustration Placeholder — Section 3 */}
            <div
              aria-label="Delegation Canvas illustration placeholder"
              className="w-full aspect-[16/8] rounded-2xl border border-border bg-muted/30 flex flex-col items-center justify-center gap-3 relative overflow-hidden"
            >
              {/* Decorative grid lines */}
              <div className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
                  backgroundSize: "48px 48px",
                }}
              />
              <div className="relative flex flex-col items-center gap-3">
                {/* Simulated node diagram */}
                <div className="flex items-center gap-6">
                  <div className="w-24 h-10 rounded-lg border border-muted-foreground/30 bg-background/50 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-muted-foreground">Master Card</span>
                  </div>
                  <div className="w-16 h-px border-t border-dashed border-muted-foreground/40" />
                  <div className="flex flex-col gap-3">
                    <div className="w-24 h-10 rounded-lg border border-muted-foreground/30 bg-background/50 flex items-center justify-center">
                      <span className="text-[10px] font-medium text-muted-foreground">Employee</span>
                    </div>
                    <div className="w-24 h-10 rounded-lg border border-muted-foreground/30 bg-background/50 flex items-center justify-center">
                      <span className="text-[10px] font-medium text-muted-foreground">AI Agent</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-medium tracking-wide uppercase opacity-40 text-muted-foreground mt-2">
                  Illustration — Coming Soon
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 4: Deep Redelegation & A2A ── */}
        <section
          id="redelegation"
          className="border-t border-border"
        >
          <div className="max-w-6xl mx-auto px-6 py-28">
            <div className="max-w-3xl mb-16">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-4">
                ERC-7710 Redelegation
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-[1.05] mb-6">
                Deep Redelegation &amp; A2A Coordination
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Allocard goes beyond flat spending limits by fully utilizing the ERC-7710 redelegation framework. Anyone
                with a Smart Account and spending authority can redelegate a subset of their limits, creating highly
                specific, autonomous chains of command. A redelegation can never exceed the limits of its parent, making
                the entire chain secure.
              </p>
            </div>

            <p className="text-muted-foreground leading-relaxed mb-12">
              This enables powerful A2A (Agent-to-Agent) and human-agent combinations:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-20">
              {[
                {
                  chain: "Company → Employee → AI Agent",
                  body: "An employee delegates $500 of their $2,000 monthly travel budget to an AI agent to autonomously book flights.",
                },
                {
                  chain: "Company → AI Agent → Employee",
                  body: "A specialized smart contract agent manages a departmental budget, programmatically distributing spending limits to staff based on performance.",
                },
                {
                  chain: "Company → AI Agent → AI Agent",
                  body: "A master procurement AI delegates specific purchasing tasks to micro-agents targeting different vendors.",
                },
                {
                  chain: "Employee → AI Agent → Contractor",
                  body: "An employee empowers a project management AI to issue a one-time final payment to an external freelancer's smart account once work is verified.",
                },
              ].map(({ chain, body }) => (
                <div
                  key={chain}
                  className="border border-border rounded-xl p-6 hover:bg-muted/20 transition-colors group"
                >
                  <p className="text-xs font-mono font-semibold text-muted-foreground mb-3 group-hover:text-foreground transition-colors">
                    {chain}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>

            {/* Illustration Placeholder — Section 4 */}
            <div
              aria-label="A2A redelegation diagram placeholder"
              className="w-full aspect-[16/7] rounded-2xl border border-border bg-muted/30 flex flex-col items-center justify-center gap-3 relative overflow-hidden"
            >
              {/* Decorative dots */}
              <div className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />
              <div className="relative flex flex-col items-center gap-3">
                {/* Multi-level chain visualization */}
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {["Company", "→", "AI Agent", "→", "AI Agent", "→", "Contractor"].map((item, i) => (
                    item === "→" ? (
                      <span key={i} className="text-muted-foreground/40 text-lg font-light">→</span>
                    ) : (
                      <div
                        key={i}
                        className="px-3 h-9 rounded-lg border border-muted-foreground/30 bg-background/50 flex items-center justify-center"
                      >
                        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{item}</span>
                      </div>
                    )
                  ))}
                </div>
                <span className="text-xs font-medium tracking-wide uppercase opacity-40 text-muted-foreground mt-3">
                  Illustration — Coming Soon
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 5: Under the Hood ── */}
        <section
          id="tech"
          className="border-t border-border bg-muted/10"
        >
          <div className="max-w-6xl mx-auto px-6 py-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
              <div className="lg:col-span-4">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-4">
                  Built for the Hackathon
                </p>
                <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-[1.05]">
                  Under the Hood
                </h2>
              </div>
              <div className="lg:col-span-8">
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-12">
                  Allocard is an end-to-end implementation of the MetaMask Smart Accounts Kit (formerly Delegation
                  Toolkit), satisfying both the Smart Accounts and A2A Coordination tracks.
                </p>

                <div className="space-y-px rounded-xl overflow-hidden border border-border">
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
          </div>
        </section>

        {/* ── Section 6: Closing ── */}
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
                {isBusy ? "Loading..." : "Try the Demo"}
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
