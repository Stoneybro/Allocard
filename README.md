# Allocard

Allocard is a corporate expense card system built on MetaMask Smart Accounts. Companies delegate spending authority to employees and AI agents. The company's funds stay in one smart account. Only valid, within-policy transactions can move them.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-allocard.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://allocard.vercel.app/)
[![Network](https://img.shields.io/badge/Network-Base%20Sepolia-0052ff?style=for-the-badge&logo=coinbase)](https://sepolia.basescan.org/)
[![MetaMask](https://img.shields.io/badge/Built%20With-MetaMask%20Smart%20Accounts%20Kit-f6851b?style=for-the-badge)](https://metamask.io/)

---

## Hackathon Track Eligibility

| Track | Status | Evidence |
|---|---|---|
| **Best A2A Coordination** | Eligible | Allocard implements full redelegation: Company issues a delegation to an Employee, who redelegates a subset to an AI Agent. All three entities hold ERC-4337 smart accounts. The delegation chain uses ERC-7710 redelegation as required by the track. |
| **Best Agent** | Eligible | The Reimbursement Agent receives a claim, calls Venice Vision to OCR the receipt, calls Venice Text to check policy, then redeems an ERC-7710 delegation on-chain to transfer ETH to the employee. No human approves the transaction. |
| **Best Use of Venice AI** | Eligible | Venice AI runs at four points in the app: reimbursement claim evaluation, receipt OCR, employee pre-spend advisory, and procurement vendor research. Two models are used: `mistral-small-3-2-24b-instruct` for text reasoning and `qwen3-vl-235b-a22b` for vision. |

---

## The Problem

Standard corporate cards pre-load funds onto a card and rely on employees following policy. If an employee breaks the rules, the money is already spent before anyone notices. Audits catch violations after the fact.

Giving an AI agent a funded wallet is the same problem at higher speed. The agent can move funds freely. Nothing stops it from spending outside its intended scope.

---

## The Solution

Allocard does not pre-load funds onto cards or wallets. Instead, it issues a **delegation**: a signed, on-chain permission that lets a delegatee spend from the delegator's smart account. Caveats attached to the delegation define the exact limits.

The Delegation Manager contract checks every caveat on each redemption attempt. A transaction that exceeds the caveat rules reverts. The company's funds do not move until a valid redemption succeeds.

This means enforcement happens at the contract level, not the policy level.

---

## How It Works

### Delegations and Caveats

A delegation is a signed object with this structure:

```
{
  delegator:  <company smart account address>,
  delegatee:  <employee smart account address>,
  caveats:    [array of spending rules],
  signature:  <delegator's EIP-712 signature>
}
```

Allocard uses six caveat types:

| Caveat | What It Enforces |
|---|---|
| `nativeTokenTransferAmount` | Lifetime cumulative ETH spending cap |
| `nativeTokenPeriodTransfer` | Recurring allowance that resets each period (hourly, daily, weekly, monthly) |
| `valueLte` | Maximum ETH per single transaction |
| `allowedTargets` | Restricts which addresses can receive funds |
| `redeemer` | Locks which address can redeem the delegation |
| `limitedCalls` | Maximum number of redemptions allowed |

### The Multi-Hop Delegation Chain

Employees can redelegate a subset of their authority to AI agents. This is the A2A coordination model:

```
Company Smart Account
  Caveats: 1 ETH lifetime, monthly reset
  |
  └── Employee Smart Account
        Caveats: 0.2 ETH lifetime, 0.05 ETH/month
        |
        └── Reimbursement Agent Smart Account
              Caveats: 0.05 ETH lifetime, out-of-pocket claims only
        |
        └── Travel Agent Smart Account
              Caveats: 0.15 ETH lifetime, flights and hotels only
```

A child delegation's caveats must be equal to or tighter than the parent's on every dimension. The server validates this before signing. The Delegation Manager contract enforces it at redemption time.

Revoking any delegation also revokes every delegation in its subtree. Revoking the employee's delegation simultaneously revokes all agent delegations that employee created.

---

## Venice AI Integration

All AI decisions in Allocard run through **Venice AI**. Venice does not retain data between requests. This keeps corporate expense data private.

### Models

| Model | Purpose |
|---|---|
| `mistral-small-3-2-24b-instruct` | Policy compliance checks, pre-spend advisory, travel research, procurement vendor selection |
| `qwen3-vl-235b-a22b` | Receipt image parsing: extracts total amount, merchant name, and date |

### Policy Layering

Before Venice evaluates any claim, the app assembles a three-layer policy context:

```
Layer 1: On-chain caveats        (hard limits from the delegation)
Layer 2: Company expense policy  (natural language, set by the employer)
Layer 3: Per-delegation rules    (e.g. "economy flights only" on a travel delegation)
```

Venice receives all three layers in the system prompt. Even if Venice approves a claim, the Delegation Manager contract independently enforces the on-chain caveat limits at redemption time.

### AI Agents

**Reimbursement Agent**

1. Employee submits a claim with a description, ETH amount, and optional receipt image.
2. If a receipt is uploaded, `qwen3-vl-235b-a22b` extracts the merchant, amount, and date.
3. `mistral-small-3-2-24b-instruct` checks the claim against the three-layer policy context.
4. If approved, the agent's backend signer redeems the employee's delegation on-chain and transfers ETH to the employee's wallet.
5. The full audit record is stored: Venice prompt, reasoning, confidence score, and transaction hash.

**Pre-Spend Advisory**

An employee can check a planned direct spend before executing it. Venice evaluates the stated purpose and amount against the company policy. The result is advisory. The employee sees the reasoning and can proceed or cancel. Flagged transactions are logged for employer review.

**Travel Agent**

An employee delegates a travel budget to this agent. The agent receives destination, dates, and the delegation's caveat limits. Venice researches flights and hotels within those limits and returns an itinerary. On employee approval, the agent redeems the delegation and executes the payment.

**Procurement Agent**

An employee delegates a procurement budget to this agent. The agent receives a tool category, team size, and the existing tool list. Venice checks for duplicate subscriptions before selecting a vendor. On approval, the agent redeems the delegation and executes the purchase.

---

## App Walkthrough

### Employer Flow

1. Connect wallet via MetaMask Embedded Wallets.
2. Create a company. This creates a `users` record and a `companies` record in the database.
3. Activate the company smart account. This deploys an ERC-4337 contract on Base Sepolia.
4. Generate an invite link for each employee.
5. Drag an employee node from the sidebar onto the React Flow canvas.
6. Open the configuration drawer. Set lifetime limit, periodic allowance, per-transaction cap, and allowed addresses.
7. Click **Activate Delegation**. The delegation is signed using the MetaMask Smart Accounts Kit and stored in the database.
8. View the full delegation tree on the canvas, including any redelegations the employee has created.
9. Click **Revoke** on any node to revoke that delegation and all its descendants.

### Employee Flow

1. Open the invite link in a browser with MetaMask.
2. Authenticate. This creates an employee `users` record linked to the company.
3. Activate your smart account on the dashboard banner.
4. View the inbound company delegation on the canvas.
5. Select an AI agent from the sidebar. Open the caveat drawer.
6. Set child caveat values. The UI caps each field at the parent delegation's limits.
7. Click **Sign and Activate Delegation**. The delegation is signed in the browser.
8. Use the Reimbursement Agent drawer to submit claims. Use the Direct Spend tab for manual transactions.

### Agent Execution (Autonomous)

1. Employee submits a reimbursement claim.
2. The `/api/agents/reimbursement/claim` route receives the request.
3. Venice Vision parses the receipt if one was uploaded.
4. Venice Text evaluates the claim against the assembled policy context.
5. If approved, the agent backend signer calls the Delegation Manager contract to redeem the delegation.
6. ETH transfers from the company smart account to the employee's wallet.

---

## Demo Tips

### Testing both roles simultaneously

Allocard uses MetaMask Embedded Wallets for authentication. The wallet session is stored in browser `localStorage`, which is shared across all tabs within the same browser window. This means **two tabs in the same browser will always share the same active wallet** — switching wallets in one tab affects the other.

To demo the Employer and Employee dashboards side-by-side with different wallets at the same time, use one of these setups:

| Setup | How |
|---|---|
| **Normal window + Incognito window** *(easiest)* | Open the employer account in a regular Chrome/Firefox window. Open the employee account in a separate Incognito/Private window. Each has its own isolated `localStorage` and cookie jar. |
| **Two browser profiles** | Use Chrome Profile 1 for the employer and Chrome Profile 2 for the employee. Each profile maintains a fully separate browser context. |
| **Two different browsers** | Open the employer in Chrome and the employee in Firefox (or any other browser). |

> **Recommended for judges:** Open the employer dashboard in a normal browser window using MetaMask, then open the employee invite link in an Incognito window and authenticate with Google. Both sessions will run independently with no interference.

---

## Features

- Spending rules are contract-enforced, not policy-enforced. Invalid transactions revert on-chain.
- The employer sees the full delegation tree including employee-created agent delegations.
- Revocation cascades automatically through the entire subtree.
- EOA addresses (plain wallets) can be delegation targets for one-off vendor payments. They cannot redelegate.
- Passwordless auth via MetaMask Embedded Wallets. No username or password stored.
- Venice AI processes no persistent data. All requests are stateless.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15, React 19 |
| UI | shadcn/ui, React Flow, Tailwind CSS |
| Blockchain | MetaMask Smart Accounts Kit (ERC-7710, ERC-4337), Viem |
| AI | Venice AI: `mistral-small-3-2-24b-instruct`, `qwen3-vl-235b-a22b` |
| Auth | MetaMask Embedded Wallets |
| Database | Neon (Postgres), Drizzle ORM |
| Deployment | Vercel, Base Sepolia testnet |
| Package Manager | pnpm (monorepo) |

---

## Local Setup

**Prerequisites:** Node.js 20+, pnpm 9+, MetaMask browser extension.

Create `apps/web/.env.local`:

```env
VENICE_API_KEY=your_venice_api_key
NEXT_PUBLIC_METAMASK_APP_ID=your_metamask_app_id
DATABASE_URL=your_neon_postgres_connection_string
```

Install and run:

```bash
pnpm install
cd apps/web
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Architecture

```
Browser
  MetaMask Embedded Wallets (auth)
  MetaMask Smart Accounts Kit (signing)
  React Flow (delegation canvas)
        |
Next.js App Router
  /employer     Employer dashboard, delegation management
  /employee     Employee dashboard, redelegation, agent picker
  /api/agents   Agent execution endpoints (reimbursement, travel, procurement)
  /api/wallet   Direct spend and policy check endpoints
        |
 ┌──────────────────────────┐    ┌─────────────────────────────────┐
 │   Neon Postgres           │    │   Venice AI                     │
 │   Drizzle ORM             │    │   mistral-small-3-2-24b-instruct│
 │   Delegation records      │    │   qwen3-vl-235b-a22b            │
 │   Audit trail             │    └─────────────────────────────────┘
 └──────────────────────────┘
        |
Delegation Manager Contract (Base Sepolia)
  ERC-7710 delegation validation
  Caveat enforcer execution
  On-chain ETH transfer
```

---

*Built for the MetaMask Smart Accounts Kit x 1Shot API Hackathon. Network: Base Sepolia. Standards: ERC-7710, ERC-4337.*
