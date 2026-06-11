# Allocard — Project Specification

## What is Allocard?

Allocard is a trustless corporate expense card system built on MetaMask Smart Accounts. It allows companies to give employees and AI agents spending authority over company funds without ever transferring those funds to them. The core mechanism is MetaMask's delegation framework — a company delegates the right to spend from its smart account, enforcing rules through on-chain caveats, rather than moving money and hoping it is spent correctly.

The problem Allocard solves is a fundamental one in corporate finance: when a company issues an expense card, it is relying entirely on employee integrity. Allocard makes this system trustless. An employee can only spend what the caveat rules allow — the enforcement is on-chain, not policy-based.

The project was built for the MetaMask hackathon and satisfies the requirements for both the Smart Accounts track (delegation, redelegation) and the A2A coordination track through platform-owned AI agents that can participate in multi-hop delegation chains.

---

## Core Mechanism: Delegation

The MetaMask Smart Accounts Kit (formerly Delegation Toolkit) is a Viem-based library that implements the ERC-7710 delegation standard. It is the only blockchain integration in this project. Everything else is standard web application development.

### How delegation works

A delegation is a signed permission that says: "Account A grants Account B the right to execute transactions on A's behalf, subject to these rules (caveats)."

The lifecycle of a delegation is:

1. The delegator creates a delegation object specifying the delegatee address and an array of caveats.
2. The delegator signs the delegation with their smart account.
3. The delegation is stored (in the Allocard database).
4. When the delegatee wants to spend, they redeem the delegation through the Delegation Manager contract, which validates the caveats and executes the transaction on the delegator's behalf.

Crucially, the funds never leave the delegator's account until a transaction is actually redeemed. The employee never holds the money. They only hold the permission to spend it within defined rules.

### Redelegation

Redelegation is when a delegatee re-issues a new delegation from the authority they received. In Allocard, this means an employee or platform agent can redelegate a portion of received authority to another allowed actor. Example chains include:

```
Company smart account → Employee smart account → AI agent smart account
Company smart account → AI agent smart account → Employee smart account
Employee smart account → AI agent smart account → AI agent smart account
Company smart account → AI agent smart account → Employee smart account → AI agent smart account
```

A redelegation cannot exceed the authority of the parent delegation. If an employee has a $500/month spending limit, they cannot redelegate a $1000/month limit to an agent. This is enforced on-chain by the Delegation Manager.

### Open delegation

An open delegation is one where the delegatee field is left unspecified, meaning any address can redeem it. This may be used in certain Allocard flows but is marked speculative and should be implemented carefully since open delegations carry risk of misuse.

### Caveat enforcers

Caveats are the rule layer of a delegation. For the MVP, Allocard uses native Base Sepolia ETH only and keeps the caveat set narrow:

- `nativeTokenTransferAmount` — total cumulative native ETH spending cap
- `nativeTokenPeriodTransfer` — recurring native ETH allowance that resets each period
- `valueLte` — caps the value of any single transaction
- `allowedTargets` — restricts which contract addresses can be called
- `redeemer` — locks which address can redeem the delegation
- `limitedCalls` — caps the total number of times a delegation can be redeemed
- `custom` — reserved for future custom caveat enforcers

ERC-20 caveats, calldata restrictions, method restrictions, streaming allowances, and multi-token allowances are intentionally out of scope for the first demo.

---

## Accounts and Authentication

All users authenticate via MetaMask Embedded Wallets. There is no traditional username/password system. Every user gets an embedded wallet on signup which acts as their signer.

### Smart accounts

Smart accounts in the MetaMask Smart Accounts Kit are ERC-4337 compliant smart contract wallets. They are what enable delegation — only smart accounts can be delegators. Every entity in Allocard that needs to delegate has a smart account:

- The company has a smart account (the master card).
- Employees have smart accounts (so they can redelegate).
- AI agents have smart accounts (platform-deployed, controlled by backend signer keys).

Smart accounts are deployed on-chain. They are not created until the user explicitly activates them. Before activation, the `smart_account_address` field in the database is null.

### EOA recipients

It is also possible to delegate to a plain externally owned account (EOA) — a regular wallet address with no smart contract. This supports one-time payments to vendors or contractors who are not on the platform. EOA recipients cannot redelegate. They are terminal nodes in the delegation chain.

---

## User Roles

There are two roles in Allocard: employer and employee. Both are human users stored in the `users` table with a `role` enum distinguishing them.

### Employer (company module)

The employer is the accounting team of a company. They log in and manage everything through the employer module. They are the owner of the company record and the master card smart account. There is one employer account per company and one smart account per company.

### Employee (employee module)

An employee is a member of a company who has accepted an invite. They have their own smart account which is the target of delegations from the company. They can redelegate their authority to AI agents and EOA addresses, but they cannot redelegate to other employees.

---

## Onboarding Flows

### Company onboarding

1. The accounting team visits Allocard and authenticates with MetaMask Embedded Wallets.
2. If the connected wallet already belongs to an employer or employee, the app routes directly to the matching dashboard.
3. If the wallet is new, the app routes to `/onboarding`, where the user can create a company or read the employee invite instructions.
4. When the user creates a company, a `users` row is created with `role='employer'`, and a `companies` row is created with the formatted company name and generated invite code.
5. The employer is routed to `/employer`. The company smart account remains null until the card activation flow deploys it.

### Employee onboarding

1. The employer generates an invite link from `/employer`. An `invites` row is created with `status='pending'`.
2. The employee opens `/invite/[inviteCode]`. The invite code is validated against the `invites` table to find the correct company.
3. The employee authenticates with MetaMask Embedded Wallets. A `users` row is created with `role='employee'` and `company_id` set to the company from the invite.
4. The invite is updated to `status='accepted'`, `accepted_at` is set, and `accepted_by_user_id` is set to the employee user.
5. The invite link is only required for first-time onboarding. Future visits resolve the employee from `embedded_wallet_address` and route directly to `/employee`.
6. The employee's profile appears in the employer's employee list, making them available for future delegation workflows.

### Active routes

| Route | Purpose |
|---|---|
| `/` | Landing page and authentication CTA |
| `/onboarding` | New connected wallets create a company or see employee invite instructions |
| `/invite/[inviteCode]` | First-time employee company association |
| `/employer` | Employer dashboard |
| `/employee` | Employee dashboard |

---

## The Employer Module

The employer module is a shadcn-styled dashboard with a sidebar and a main canvas area.

### Sidebar

The sidebar contains employee recipients, invite creation, and an external-address entry form. Employees can be clicked or dragged onto the canvas. AI agents remain in the data model, but the employer UI hides agent recipients until the Phase 6 agent lifecycle is implemented.

### Canvas

The canvas is built with React Flow. It has a permanent node representing the company's master card (styled to look like a physical corporate card). All delegation relationships branch out from this node as a tree.

Above the canvas, there are summary cards showing: number of employees, active delegations, active agents, and total delegated funds. Agent metrics currently remain zero in the employer UI until Phase 6.

### Delegation flow on the employer canvas

1. The employer clicks or drags an employee from the sidebar onto the canvas, or adds an EOA with the external-address form. A new node appears in a `pending_config` state. A `delegations` row is inserted with `status='pending_config'` and the canvas position.
2. The employer opens the configuration drawer for that node. They configure native ETH caveats: maximum amount, optional recurring period amount, optional allowed targets, optional redeemers, optional limited call count, optional per-transaction cap, and optional custom caveat enforcer data. Caveat rows are written to `delegation_caveats`.
3. The employer clicks Activate. The delegation is created and signed with the company smart account using the Smart Accounts Kit. The `delegations` row is updated with `delegation_hash`, `signed_delegation`, `status='active'`, and `activated_at`.

### Viewing the full tree

The employer can see the entire company delegation tree on their canvas, including redelegations made by employees. Employee-originated delegations are shown branching from the employee node. The employer cannot modify these but can see them.

### EOA delegation from employer canvas

The employer can also delegate to an external address (EOA) directly from the canvas. There is an "Add address" option that accepts a raw wallet address and an optional label. EOA nodes are visually distinct and have no further branching — they are always terminal.

### Limitations on the employer canvas

If the employer has delegated to an employee, the employer cannot extend that delegation further on their own canvas. Only the employee can redelegate from their own module. Employer-to-agent delegation is intentionally deferred until Phase 6.

---

## The Employee Module

The employee module is structurally similar to the employer module — a shadcn dashboard with a sidebar and React Flow canvas — but scoped to the employee's own delegation authority.

### Association with employer

When an employee signs up via an invite link, their `company_id` is set automatically. The employee module loads their company's information from this relationship. There is no manual employer lookup required after onboarding.

### Employee canvas

The permanent node on the employee canvas is their own smart account address (not a card metaphor — just their account node). Branching from it are any redelegations they have made to agents or EOA addresses.

The employee can see the delegation they received from the company but cannot modify it. They can only redelegate from their own authority.

### Redelegation from employee canvas

The employee can redelegate to approved platform AI agents or to EOA addresses. The caveat configuration must be equal to or more restrictive than the parent delegation from the company. If the parent delegation allows $500/month in USDC, the employee cannot redelegate $600/month. This is enforced both in the UI (capped inputs) and on-chain by the Delegation Manager.

### EOA delegation from employee canvas

Same as the employer — the employee can add a raw wallet address with an optional label for one-time payments. EOA nodes are terminal and cannot redelegate.

---

## AI Agents

AI agents are global Allocard platform agents. They are not created by employers or employees. The platform operator creates and maintains the agent catalog, and every company can delegate to the approved platform agents that Allocard exposes in the product.

Each agent has its own smart account address (deployed deterministically via the Smart Accounts Kit `Hybrid` implementation) and a backend-controlled signer key. The platform manages these keys; they are not exposed to the employer, employee, or browser.

Agents are named entities in the system: **Procurement Agent**, **Travel Agent**, and **Reimbursement Agent**. They are listed in the sidebar of both the employer and employee modules and can be delegated to like any other recipient.

Because the platform controls the agent's signing key, agents can execute or redelegate on-chain authority automatically within the bounds of their caveats. This is the A2A coordination story: an employer, employee, or agent delegates constrained authority to another agent, and each downstream action remains limited by the parent delegation.

**Venice AI** acts as the reasoning and policy layer for these agents:
- **Vision (`qwen3-vl`)**: Used by the Reimbursement Agent to OCR uploaded receipts and verify they match the stated claim.
- **Reasoning (`mistral-small-instruct`)**: Used by the Travel and Procurement agents to generate compliant, structured JSON transaction intents (flights, hotels, software subscriptions). It also checks for duplicate tools before paying a vendor.
- **Advisory Policy Check**: Before an employee makes a direct manual spend, Venice evaluates the purpose against their active delegation caveat policy to warn them if a transaction will be flagged.

Allocard still validates the proposed action against stored caveats, delegation status, and role rules before any redemption is attempted on-chain via the Bundler.

### Active Platform Agents

| Agent | Role | Venice AI responsibility | On-chain role |
|---|---|---|---|
| **Reimbursement Agent** | Reimburses employees for out-of-pocket expenses. | **Vision**: OCRs uploaded receipt images. Verifies the total amount and matches the receipt against the employee's claim description and policy constraints. | Executes a direct native ETH transfer to the employee's personal wallet (from the company master card) if approved. |
| **Travel Agent** | Books flights and lodging based on employee requests. | **Text**: Generates structured flight and hotel plans within budget. Evaluates destinations against policy constraints. | Executes the payment to the required merchant target using the employee's redelegated allowance. |
| **Procurement Agent** | Purchases software and vendor subscriptions. | **Text**: Researches the best software vendor. Crucially, it checks the company's existing toolstack to prevent duplicate software spend. | Executes the subscription payment to the vendor using the employee's redelegated allowance. |

These agents allow trustless automation:
```text
Company → Reimbursement Agent → (Direct to Employee's wallet)
Company → Employee → Travel Agent → (Flight/Hotel Merchant)
Company → Employee → Procurement Agent → (Software Vendor)
```

---

## Database Schema

### companies

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | Company name |
| owner_id | uuid FK → users | The employer account |
| smart_account_address | text nullable | Null until card is activated |
| invite_code | text unique | Used for employee onboarding |
| created_at | timestamp | |

### users

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| embedded_wallet_address | text | From MetaMask Embedded Wallets |
| smart_account_address | text nullable | Null until account activated |
| role | enum | employer \| employee |
| company_id | uuid FK → companies | Nullable for employer pre-setup |
| created_at | timestamp | |

### agents

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | Human-readable agent name |
| slug | text unique | Stable platform identifier |
| role | text | Agent role, such as policy, procurement, travel, vendor_payment, or reconciliation |
| description | text | Human-readable explanation of what the agent does |
| status | enum | enabled \| disabled |
| venice_config | jsonb | Model, prompt profile, tools, and structured output settings |
| smart_account_address | text | Platform-deployed |
| backend_signer_address | text | Platform-controlled signer |
| created_at | timestamp | |

### invites

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| invite_code | text unique | |
| accepted_by_user_id | uuid FK → users nullable | User that accepted the invite |
| status | enum | pending \| accepted \| expired |
| created_at | timestamp | |
| accepted_at | timestamp nullable | |

### delegations

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| parent_delegation_id | uuid FK → delegations nullable | Parent delegation for redelegation chains |
| delegator_type | enum | company \| user \| agent |
| delegator_id | uuid | References companies, users, or agents depending on type |
| delegatee_type | enum | user \| agent \| eoa |
| delegatee_id | uuid nullable | Null when delegatee_type is eoa |
| delegatee_address | text nullable | Populated only for eoa delegatees |
| delegatee_label | text nullable | Optional human-readable name for EOA recipients |
| delegation_hash | text | On-chain hash after activation |
| signed_delegation | jsonb nullable | Signed delegation object stored for later redemption |
| policy_prompt | text nullable | Natural language constraints to feed Venice AI |
| status | enum | pending_config \| active \| revoked |
| canvas_position_x | float | React Flow canvas x position |
| canvas_position_y | float | React Flow canvas y position |
| created_at | timestamp | |
| activated_at | timestamp nullable | |
| revoked_at | timestamp nullable | |

### delegation_caveats

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| delegation_id | uuid FK → delegations | |
| caveat_type | enum | nativeTokenTransferAmount \| nativeTokenPeriodTransfer \| valueLte \| allowedTargets \| redeemer \| limitedCalls \| custom |
| caveat_value | jsonb | Parameters for the caveat (amount, period, target addresses, redeemer address, etc.) |
| created_at | timestamp | |

### Activity & Spend Ledgers

To ensure complete transparency over delegated funds, three tables track actual spending and AI reasoning:

#### claim_redemptions
Logs reimbursements processed by the Reimbursement Agent. Contains the employee's claim, the uploaded receipt URL, and Venice AI's vision OCR reasoning to approve or reject the claim, along with the executed txHash.

#### agent_bookings
Logs autonomous purchases executed by the Travel and Procurement Agents. Contains the generated `TravelPlan` or `VendorChoice` JSON, Venice AI's reasoning, and the executed txHash.

#### manual_transactions
Logs direct manual spends initiated by employees from their Wallet tab. Contains the amount, target, the employee's stated purpose, whether Venice AI flagged the transaction pre-spend, and a post-spend receipt summary verified by Venice.

### Key schema decisions

The `delegations` table uses a polymorphic pattern. Instead of separate foreign key columns for each entity type, it uses `delegator_type` + `delegator_id` together. This means the same table handles all delegation chain variants without requiring multiple join tables. Application logic resolves the correct table based on `_type`.

The `caveat_value` column is JSONB to accommodate the different parameter shapes across caveat types without requiring a column per caveat type.

Canvas positions are stored on the delegation row itself so the React Flow layout persists across sessions without a separate positions table.

---

## Delegation Chain Rules

These rules must be enforced in both the UI and backend:

1. Only smart accounts can be delegators. Companies, employees, and agents all have smart accounts.
2. EOA recipients are always terminal — they cannot create further delegations.
3. An employee cannot redelegate to another employee.
4. A redelegation's caveats must be equal to or more restrictive than the parent delegation's caveats.
5. The employer cannot redelegate on behalf of employees. Employees manage their own redelegations from their own module.
6. Employers and employees cannot create agents; they can only delegate to approved platform agents.
7. Agents can redelegate only when the parent delegation and caveat restrictions allow the narrower child delegation.
8. Agent-created actions must be auditable, including the source delegation, Venice-generated intent, validation result, and transaction result.
9. Revoking a parent delegation invalidates all child delegations in the chain. This must be reflected in the `status` field of all affected `delegations` rows.

---

## UI Framework and Design

The application uses shadcn as the primary UI component library. The layout for both modules follows a standard shadcn dashboard pattern: a fixed sidebar on the left containing navigation and recipient lists, and a main content area to the right containing the React Flow canvas and the summary cards above it.

Current Phase dashboard functionality:

- **Employer Canvas**: Fully functional React Flow delegation tree. The master card is the root node. Employers can visually assign delegations.
- **Employer Activity Log**: A unified data table (in a separate tab) aggregating all `manual_transactions`, `agent_bookings`, and `claim_redemptions`, exposing exactly *why* Venice AI approved or flagged an expense.
- **Employee Canvas**: React Flow tree restricted to the employee's active delegations. Employees drag-and-drop the Travel and Procurement agents into their canvas to redelegate constraints.
- **Employee Wallet Tab**: An interactive interface allowing employees to spend their delegated authority directly. Features a pre-spend Venice Advisory Policy check, and post-spend receipt OCR validation.
- **Agent Drawers**: Employees interact with agents via slide-out drawers (e.g., `TravelAgentDrawer`, `ProcurementAgentDrawer`) to input natural language requests that Venice translates into structured, on-chain execution payloads.

---

## What is Not Yet Fully Specified

The following minor areas were flagged during planning and will need to be worked out during future iterations:

- Open delegation usage, if any, and how it appears in the canvas UI.
- Signed session/cookie middleware. Current route protection depends on the connected wallet state in the browser.
- Multi-token support. The MVP relies strictly on Base Sepolia Native ETH.

---

## Current Implementation Handoff

Phase 1 and Phase 2 are complete.

Implemented:

- Drizzle + Neon PostgreSQL schema and migration.
- The current migration is `apps/web/drizzle/0000_perpetual_big_bertha.sql`.
- The migration has been applied to the configured Neon database.
- `/` is the landing page and authentication CTA.
- `/onboarding` handles new connected wallets.
- `/invite/[inviteCode]` handles first-time employee company association.
- `/employer` is the employer dashboard shell.
- `/employee` is the employee dashboard shell.
- `app/actions/identity.ts` contains the server actions for wallet lookup, employer creation, invite creation, invite details, invite acceptance, and employee lookup.
- `users.embedded_wallet_address` is the identity key. Emails are intentionally not used.
- `invites.accepted_by_user_id` and `invites.accepted_at` record invite acceptance.
- Delegation statuses are `pending_config`, `active`, and `revoked`; there is no `paused` status.
- MVP token scope is native Base Sepolia ETH only.

Phase 3 should continue from the existing `/employer` shell:

- Keep `section-cards.tsx` and convert it from placeholder metrics to real employer metrics.
- Keep `dashboard-flow-canvas.tsx` and convert it from placeholder nodes to the company delegation tree.
- Keep the current Phase 2 invite creation and employee list behavior.
- Next work should focus on real employer sidebar recipients, summary cards, master card node, employee nodes, agent placeholders or model-backed agents, and canvas persistence.
