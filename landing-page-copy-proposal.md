# Allocard Landing Page Copy Proposal

Status: Proposed copy for review. Designed to fit the existing layout in LandingPageClient.tsx without altering component structure or design.

---

## Navigation

- **Logo:** Allocard
- **Links:** Problem · How it Works · Agents · Canvas · GitHub
- **CTA Button:** Sign in

---

## Hero Section

### Tag
Monad Metropolis Hackathon · Alpha Release

### Headline
# Revolutionizing Corporate Expense Cards.

### Subtitle
Build your own in-house corporate card system without relying on third-party providers. Let employees spend company funds without sending money to them in advance, and keep absolute control over how people and AI agents use your budget.

### Buttons
- **Primary Button:** Sign in
- **Secondary Button:** View on GitHub

### Note Below Buttons
Alpha release on Monad Testnet with test funds. Sign in with Google or email.

### Image
Existing image: `/Allocardmodelcard.png`

---

## Technology and Security Strip

Five badges matching the horizontal strip:

1. Monad Network
2. Smart Account Security
3. Zero Pre-Funded Balances
4. Private AI Policy Checks
5. Google and Email Sign-In

---

## Problem Section

### Eyebrow
The Problem

### Headline
### Spend violations are found after the money is gone.

### Main Text
Traditional corporate cards rely on outside banks and card issuers that require pre-funding accounts or setting broad credit lines. Employees and AI tools get access to far more money than any single purchase needs. If someone overspends or violates policy, managers only find out days later during monthly audits.

### Three Problem Cards

1. **Cards are pre-funded**  
   Money is transferred or credited before the purchase happens, leaving company funds exposed if a card is lost or misused.

2. **AI tools have no built-in spending limits**  
   Handing a corporate card or wallet to an AI agent is usually a blank check. If the agent makes a mistake, nothing stops the purchase from going through.

3. **You depend on third-party card providers**  
   External card platforms manage your spending rules inside their private systems. You rely on them to enforce limits, hold your funds, and resolve disputes after issues occur.

---

## How It Works Section

### Eyebrow
How Allocard Works

### Headline
### Delegation, not pre-loading.

### Main Text
Allocard lets you run your own in-house corporate card system. Your company keeps all funds in a single master account. Instead of wiring money to employees, you give them permission to spend up to clear limits you define. Every purchase is verified on the spot before any money leaves your account. If a transaction breaks a rule, it gets stopped immediately.

### Feature Comparison Table

| Corporate Card Feature | How Allocard Enforces It |
| :--- | :--- |
| Per-user spending limit | Lifetime budget cap set on the permission |
| Monthly allowance reset | Spending balance that resets automatically on a calendar schedule |
| Per-transaction cap | Maximum amount allowed for any single purchase |
| Merchant restrictions | Approved list of recipient addresses |
| Instant card cancellation | Revoking permission cuts off access immediately, including downstream agents |
| Virtual cards for AI agents | Scoped permissions created for specific tasks without funding separate wallets |

### Three Spending Modes

1. **Company → Employee → Agent**  
   *Redelegation: The agent buys on your behalf.*  
   An employee passes a slice of their approved budget to an AI agent to handle travel or software purchases. The agent can only spend within that slice, and the company never sends money upfront.

2. **Company → Agent → Employee**  
   *Reimbursements: The agent pays you back.*  
   The company authorizes a shared reimbursement budget for the agent. When an employee uploads a receipt, the agent checks the claim against company policy and sends reimbursement directly to the employee.

3. **Company → Employee (Direct)**  
   *Direct spend: Everyday company purchases.*  
   The employee uses their permission directly to pay an approved vendor. The AI checks company expense rules before the transaction clears.

---

## Venice AI Section

### Eyebrow
Venice AI

### Headline
### Policy checks before every transaction.

### Left Column Text
Every agent purchase passes through Venice AI before execution. The AI reviews the purchase against company guidelines, budget limits, and task rules. It returns an immediate approval or rejection with a clear explanation.

The AI checks company policy while the account rules check the numbers. Neither can override the other. Venice retains zero user data between requests.

### Right Column: Three Policy Checks

1. **Hard Account Limits**  
   Total budget, per-purchase caps, and approved vendor addresses.

2. **Company Expense Policy**  
   Plain-language rules you write, like hotel star ratings or software categories.

3. **Task-Specific Limits**  
   Extra boundaries added when passing a budget to an agent, like a limit on flight prices.

---

## Agents Section

### Eyebrow
Agent System

### Headline
### Three agents. Every expense workflow covered.

### Main Text
Each agent operates with its own account and only within the permission it receives. They execute purchases independently, so you never have to wire funds to an agent or approve routine receipts manually.

### Three Agent Cards

1. **Travel Agent**  
   *Pattern: Employee passes budget → Agent executes*  
   **Books travel within your approved budget.**  
   Enter your trip details. The agent creates an itinerary that fits your company policy and budget limits. Once approved, the agent completes the payment.  
   *Policy check:* Reviews dates, hotel rates, and ticket classes against company travel rules.

2. **Procurement Agent**  
   *Pattern: Employee passes budget → Agent executes*  
   **Buys software tools and checks for duplicates first.**  
   Submit a tool request and team size. The agent checks whether your team already pays for a similar tool, selects the right tier, and buys the subscription.  
   *Policy check:* Flags duplicate software subscriptions and enforces seat budget caps.

3. **Reimbursement Agent**  
   *Pattern: Company sets budget → Agent pays employee*  
   **Pays employees back for out-of-pocket expenses.**  
   Submit a receipt and a short explanation. The agent scans the receipt, verifies that the expense fits company rules, and transfers the money back to the employee right away.  
   *Policy check:* Reads the receipt details with image models and matches the claim to company policy.

---

## Delegation Canvas Section

### Eyebrow
Delegation Canvas

### Headline
### The full spending authority tree, at a glance.

### Main Text
See every active spending permission across your company in a visual tree. The company sits at the root, employees branch off it, and AI agents branch from employees. You have absolute control on the fly: adjust any limit in real time, or remove an employee to revoke access for all their connected agents instantly.

### Image
Existing image: `/delegationCanvas.png`

### Three Canvas Highlights

1. **Employer View**  
   See everyone who holds spending permissions and edit their limits on the fly.

2. **Employee View**  
   Check your available budget and see which AI agents you have authorized.

3. **Cascading Cutoff**  
   Removing a team member revokes access for all their connected agents at the same time.

---

## Tech Stack Section

### Eyebrow
Tech Stack

### Headline
### What it runs on.

### Main Text
Built with modern web tools, smart account standards, and private AI. Running live on the Monad test network.

### Six Tech Cards

1. **Next.js 15 and React 19**  
   Application framework

2. **Smart Account Delegation**  
   Permission controls and automatic limit verification

3. **Privy**  
   Email and Google sign-in with embedded accounts

4. **Neon and Drizzle**  
   Postgres database and ORM

5. **React Flow**  
   Interactive visual spending tree

6. **Monad Testnet**  
   High-performance EVM network

---

## Closing Call to Action

### Eyebrow
Interactive Prototype

### Headline
### See it run on Monad Testnet.

### Main Text
Sign in with Google or email. Issue a spending permission, pass a small budget to an AI agent, and watch purchases settle under rules you control.

### Buttons
- **Primary Button:** Sign in
- **Secondary Button:** View on GitHub

---

## Footer

- **Brand:** Allocard
- **Description:** Monad Metropolis Hackathon. Consumer Products and Payments Track. Running on Monad Testnet.
- **Link:** GitHub
