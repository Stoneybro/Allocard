<div align="center">
  <img src="./apps/web/public/AllocardLogoWhite.svg" alt="Allocard Logo" width="120" />
  <h1>Allocard</h1>
  <p><strong>The corporate expense system for teams and autonomous AI on Monad.</strong></p>

  <p>
    <a href="https://allocard.vercel.app/"><img src="https://img.shields.io/badge/Live%20Demo-allocard.vercel.app-6366f1?style=for-the-badge&logo=vercel" alt="Live Demo" /></a>
    <a href="https://testnet.monadexplorer.com/"><img src="https://img.shields.io/badge/Network-Monad%20Testnet-836EF9?style=for-the-badge" alt="Network" /></a>
    <a href="https://metamask.io/"><img src="https://img.shields.io/badge/Built%20With-MetaMask%20Delegation%20Toolkit-f6851b?style=for-the-badge" alt="MetaMask" /></a>
    <a href="https://github.com/Stoneybro/Allocard"><img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github" alt="GitHub" /></a>
  </p>
</div>

---

## Overview

Traditional corporate cards and crypto setups force companies to choose between two bad options: handing employees shared credit cards (risking runaway charges), or transferring crypto upfront into employee wallets (losing custody of treasury funds).

**Allocard replaces shared cards and upfront transfers with programmable spending permissions.**

Instead of pre-funding employee accounts, your money stays 100% in your company treasury. Employers issue cryptographic permissions with exact spending rules (caps, reset schedules, and merchant restrictions). Funds never enter the employee's personal wallet: capital moves directly from the company account to the vendor only when an authorized purchase occurs.

---

## Core Features

### 1. Visual Spend Map (Delegation Canvas)
Monitor and manage your entire company spend in real time. The interactive canvas maps your company treasury, active employee allowances, and sub-delegated AI agents in a single visual tree.

### 2. Direct Vendor Spend
Employees execute business payments directly within their delegated limit. Powered by ERC-4337 and Monad's high-throughput architecture, payments settle in under one second directly from the company treasury with zero gas fees for employees.

### 3. Automated Receipt Auditing & AI Reimbursements
If an employee pays for a business expense with personal funds, getting reimbursed is effortless. The employee uploads a photo of their receipt; vision AI reads the merchant, date, and line items, verifies company policy compliance, and settles the claim automatically.

### 4. Autonomous AI Tooling Procurement
Employees can allocate a portion of their authorized budget to autonomous software agents. Our Cloud and Tooling Agent evaluates requirements, scours verified Monad ecosystem partners (Chainstack, Crouton Digital, Ack3 AI, Envio), recommends the optimal plan, and executes the purchase onchain within its strict mathematical limit.

### 5. Global Offchain Remittances via Agora AUSD
Allocard is not limited to onchain payments. Using the Agora Digital Dollar (AUSD), companies settle real-world international contractor invoices and foreign travel expenses at live mid-market exchange rates, saving $45 SWIFT bank wire fees on every payout.

### 6. 1-Click Consumer Onboarding via Privy
No seed phrases, browser extensions, or gas tokens needed. Team members sign in with their corporate email or Google account. Privy automatically provisions embedded smart account signers behind the scenes.

---

## How It Works

```
Company Treasury (Smart Account on Monad)
       │
       ├── EIP-712 Delegation (MetaMask Delegation Core)
       │     └─ Caveats: Spend Caps, Periodic Resets, Allowed Targets
       │
       ├── Employee Spending Permission (Privy Embedded Signer)
       │     ├── Direct Spend (Sub-second Monad settlement via Pimlico)
       │     └── Sub-Delegation to AI Agent (Mathematical limit)
       │
       └── Funds leave treasury ONLY when a valid onchain check passes
```

1. **Company Treasury Setup:** The company deploys an ERC-4337 Hybrid Smart Account on Monad Testnet, funded in Agora AUSD (automatically seeded with 10,000 AUSD from our testnet faucet integration).
2. **Programmable Caveats:** Employers configure spending rules (lifetime cap, recurring period, allowed merchant targets). These rules are signed offchain as EIP-712 delegations using MetaMask Delegation Core.
3. **Execution at Checkout:** When an employee or agent makes a purchase, the transaction is submitted via an ERC-4337 bundler. Monad's Delegation Manager validates the signature and caveats onchain. If valid, the exact payment is transferred directly from the company treasury to the recipient.

---

## The Core Engine: MetaMask Delegation Toolkit

Allocard is powered natively by the **MetaMask Smart Accounts Kit** (`Implementation.Hybrid`) and **MetaMask Delegation Core** (`@metamask/delegation-core`). 

Instead of traditional models where companies either hand out shared credit cards or transfer crypto upfront into employee wallets, Allocard uses MetaMask delegations to treat spending budgets as programmable, cryptographically verifiable access tokens.

### 1. Offchain Signing with Zero Upfront Capital
Delegations are EIP-712 typed data structures signed offchain by the employer's smart account. Creating, adjusting, or distributing spending permissions costs zero gas. Because no tokens are transferred upfront, 100% of the company's capital remains in the central treasury.

### 2. Onchain Caveat Enforcers
MetaMask Delegation Core enforces company spending rules mathematically onchain before a transaction can execute:
- **Periodic Budget Allowances (`erc20PeriodTransfer`):** Automatically resets an employee's authorized spending budget weekly or monthly without manual accounting top-ups.
- **Per-Transaction Caps (`valueLte`):** Guarantees no single purchase exceeds approved departmental policy.
- **Approved Merchant Whitelists (`allowedTargets`):** Restricts payment execution strictly to verified vendor contract addresses or wallets.
- **Call Ceilings (`limitedCalls`):** Restricts the total number of times an authorization can be redeemed.

### 3. Composable Redelegation (Empowering AI Agents)
MetaMask's delegation model supports multi-hop redelegation. An employee who receives a spending delegation from the company can sub-delegate a slice of their authorized budget to an autonomous software assistant (such as our Cloud and Tooling Agent). 
- The AI agent receives its own distinct spending authorization.
- The agent's permissions can never exceed the parent employee's caveats.
- The agent cannot divert funds to unapproved targets or exceed its assigned spending cap.

### 4. Instant Cascading Revocation
If an employee leaves or an authorization needs to be frozen, the employer can revoke the root delegation onchain in one click. Revoking a parent delegation instantly invalidates all child permissions and AI agent sub-delegations down the branch, with zero risk of stranded capital.

---

## Tech Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Network** | Monad Testnet (Chain ID 10143) | Sub-second transaction settlement and high-throughput execution |
| **Smart Accounts** | MetaMask Smart Accounts Kit (`Implementation.Hybrid`) | Non-custodial company and employee smart accounts |
| **Permissions** | `@metamask/delegation-core` | EIP-712 caveat enforcement (spend limits, periods, targets) |
| **Account Abstraction** | Viem + Pimlico Bundler & Paymaster | Gasless UserOperations for team members |
| **Stablecoin** | Agora Digital Dollar (AUSD) | Primary financial rail for payments and global remittances |
| **Authentication** | Privy (`@privy-io/react-auth`, `@privy-io/wagmi`) | Embedded wallets with 1-click Google and email sign-in |
| **AI Intelligence** | Alibaba Cloud Qwen (2.5 72B & 2.5 VL) | Autonomous sponsor plan matching & multi-modal receipt OCR |
| **Frontend** | Next.js (App Router), Tailwind CSS, Radix UI | Fast, modern web interface |
| **Canvas** | `@xyflow/react` | Interactive drag-and-drop delegation tree |
| **Database** | Drizzle ORM + Neon Serverless PostgreSQL | Server-side session verification and state persistence |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Stoneybro/Allocard.git
   cd Allocard
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in `apps/web/`:
   ```env
   # Privy Authentication
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
   PRIVY_APP_ID=your_privy_app_id
   PRIVY_APP_SECRET=your_privy_app_secret
   SESSION_SECRET=your_32_char_session_secret

   # Pimlico Account Abstraction (Monad Testnet)
   NEXT_PUBLIC_BUNDLER_RPC_URL=https://api.pimlico.io/v2/10143/rpc?apikey=your_pimlico_api_key
   NEXT_PUBLIC_PAYMASTER_RPC_URL=https://api.pimlico.io/v2/10143/rpc?apikey=your_pimlico_api_key
   NEXT_PUBLIC_PIMLICO_SPONSOR_ID=your_policy_id

   # Database (Neon PostgreSQL)
   DATABASE_URL=postgresql://user:password@endpoint.neon.tech/allocard?sslmode=require

   # Alibaba Cloud Model Studio (Qwen AI)
   DASHSCOPE_API_KEY=your_dashscope_api_key
   ```

4. Push the database schema:
   ```bash
   cd apps/web
   pnpm db:push
   ```

5. Start the development server:
   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Hackathon Submission Tracks

- **Monad Metropolis Hackathon:** Product & Consumer Track
- **Agora Bounty:** Best Cross-Border Payments App on Monad (Agora Payments Bounty)
- **Privy Bounty:** Meaningful Web2-to-Web3 Embedded Onboarding

---

## Project Structure

```
Allocard/
├── apps/
│   └── web/
│       ├── app/               # Next.js App Router (Landing, Employer, Employee, API)
│       ├── components/        # UI components, cards, drawers, canvas nodes
│       ├── lib/
│       │   ├── agora/         # Live mid-market FX rates & remittance program logic
│       │   ├── ai.ts          # Qwen 2.5 72B & VL receipt OCR and sponsor evaluation
│       │   ├── chain.ts       # Monad Testnet config & Agora AUSD contract addresses
│       │   ├── client.ts      # Viem, Pimlico bundler, and public client utilities
│       │   ├── db/            # Drizzle ORM schema and database connection
│       │   ├── delegation.ts  # MetaMask delegation caveats and signing utilities
│       │   └── smartAccount.ts# MetaMask Hybrid Smart Account factory
│       └── public/            # Static assets, logos, and sample receipts
├── demo-script.md             # 3-minute video recording walkthrough & TTS narrative
└── package.json
```

---

## Author

Built by **Zion Livingstone** ([Next Studios](https://github.com/Stoneybro))  
Previous Work: Complyr (Onchain audit infrastructure using fully homomorphic encryption)

---

## License

This project is licensed under the [MIT License](LICENSE).
