# Allocard — Project Specification

## What is Allocard?

Allocard is a trustless corporate expense card system built on MetaMask Smart Accounts. It allows companies to give employees and AI agents spending authority over company funds without ever transferring those funds to them. The core mechanism is MetaMask's delegation framework — a company delegates the right to spend from its smart account, enforcing rules through on-chain caveats, rather than moving money and hoping it is spent correctly.

The problem Allocard solves is a fundamental one in corporate finance: when a company issues an expense card, it is relying entirely on employee integrity. Allocard makes this system trustless. An employee can only spend what the caveat rules allow — the enforcement is on-chain, not policy-based.

The project was built for the MetaMask hackathon and targets three tracks:

- **Best Agent** — Reimbursement Agent with Venice AI reasoning and on-chain delegation redemption
- **Best Venice AI** — Venice used at two touchpoints (employee pre-spend advisory + agent claim policy check), including text reasoning and vision for receipts
- **Best A2A Coordination** — Company → Employee → Agent multi-hop delegation chains using Phase 5 employee redelegation

---

## Core Mechanism: Delegation

The MetaMask Smart Accounts Kit (formerly Delegation Toolkit) is a Viem-based library that implements the ERC-7710 delegation standard. It is the only blockchain integration in this project. Everything else is standard web application development.

### How delegation works

A delegation is a signed permission that says: "Account A grants Account B the right to execute transactions on A's behalf, subject to these rules (caveats)."

The lifecycle of a delegation is:

1. The delegator creates a delegation object specifying the delegatee address and an array of caveats.
2. The delegator signs the delegation with their smart account.
3. The delegation is stored in the Allocard database.
4. When the delegatee wants to spend, they redeem the delegation through the Delegation Manager contract, which validates the caveats and executes the transaction on the delegator's behalf.

Crucially, the funds never leave the delegator's account until a transaction is actually redeemed. The employee never holds the money. They only hold the permission to spend it within defined rules.

### Redelegation

Redelegation is when a delegatee re-issues a new delegation from the authority they received. In Allocard, this means an employee can redelegate a subset of their authority to a platform AI agent. The primary chain is:

```
Company smart account → Employee smart account → AI agent smart account
```

A redelegation cannot exceed the authority of the parent delegation. If an employee has a 0.1 ETH lifetime limit, they cannot redelegate a 0.2 ETH limit to an agent. This is enforced both server-side (caveat validation in `identity.ts`) and on-chain by the Delegation Manager.

### Caveat enforcers

Caveats are the rule layer of a delegation. For the MVP, Allocard uses native Base Sepolia ETH only and keeps the caveat set narrow:

- `nativeTokenTransferAmount` — total cumulative native ETH spending cap
- `nativeTokenPeriodTransfer` — recurring native ETH allowance that resets each period
- `valueLte` — caps the value of any single transaction
- `allowedTargets` — restricts which addresses can receive funds
- `redeemer` — locks which address can redeem the delegation
- `limitedCalls` — caps the total number of times a delegation can be redeemed

ERC-20 caveats, calldata restrictions, method restrictions, streaming allowances, and multi-token allowances are intentionally out of scope for the demo.

---

## Accounts and Authentication

All users authenticate via MetaMask Embedded Wallets. There is no traditional username/password system. Every user gets an embedded wallet on signup which acts as their signer.

### Smart accounts

Smart accounts in the MetaMask Smart Accounts Kit are ERC-4337 compliant smart contract wallets. They are what enable delegation — only smart accounts can be delegators. Every entity in Allocard that needs to delegate has a smart account:

- The company has a smart account (the master card).
- Employees have smart accounts (so they can redelegate).
- AI agents have smart accounts (platform-deployed, controlled by backend signer keys).

Smart accounts are deployed on-chain. They are not created until the user explicitly activates them. Before activation, `smart_account_address` in the database is null.

### EOA recipients

It is also possible to delegate to a plain externally owned account (EOA) — a regular wallet address with no smart contract. This supports one-time payments to vendors or contractors who are not on the platform. EOA recipients cannot redelegate. They are terminal nodes in the delegation chain.

---

## User Roles

There are two roles in Allocard: employer and employee. Both are human users stored in the `users` table with a `role` enum distinguishing them.

### Employer (company module)

The employer is the accounting team of a company. They log in and manage everything through the employer module. They are the owner of the company record and the master card smart account. There is one employer account per company and one smart account per company.

### Employee (employee module)

An employee is a member of a company who has accepted an invite. They have their own smart account which is the target of delegations from the company. They can redelegate their authority to approved platform AI agents and EOA addresses, but they cannot redelegate to other employees.

---

## Onboarding Flows

### Company onboarding

1. The accounting team visits Allocard and authenticates with MetaMask Embedded Wallets.
2. If the connected wallet already belongs to an employer or employee, the app routes directly to the matching dashboard.
3. If the wallet is new, the app routes to `/onboarding`, where the user can create a company or read the employee invite instructions.
4. When the user creates a company, a `users` row is created with `role='employer'`, and a `companies` row is created with the formatted company name and generated invite code.
5. The employer is routed to `/employer`. The company smart account remains null until the card activation flow deploys it.

### Employee onboarding

1. The employer generates an invite link from the employer sidebar. An `invites` row is created with `status='pending'`.
2. The employee opens `/invite/[inviteCode]`. The invite code is validated against the `invites` table to find the correct company.
3. The employee authenticates with MetaMask Embedded Wallets. A `users` row is created with `role='employee'` and `company_id` set to the company from the invite.
4. The invite is updated to `status='accepted'`, `accepted_at` is set, and `accepted_by_user_id` is set to the employee user.
5. The invite link is only required for first-time onboarding. Future visits resolve the employee from `embedded_wallet_address` and route directly to `/employee`.

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

The employer module is a shadcn-styled dashboard with a sidebar and a main React Flow canvas area. **This is fully implemented.**

### Sidebar

The sidebar contains:
- Company name and smart account status/address
- Invite creation (generates a shareable invite link)
- Employee recipient list (click or drag onto canvas)
- EOA address entry form (add external wallet addresses with optional labels)

AI agent recipients are listed in the sidebar data model and will be activatable once Phase 6 agent catalog seeding is complete.

### Canvas

The canvas is built with React Flow. It has a permanent node representing the company's master card (styled to look like a physical corporate card). All delegation relationships branch out from this node as a tree.

Above the canvas, four summary cards show: number of employees, active delegations, active agents, and total delegated ETH allowance.

### Delegation flow on the employer canvas

1. The employer clicks or drags an employee from the sidebar onto the canvas, or adds an EOA with the address entry form. A new node appears in a `pending_config` state. A `delegations` row is inserted with `status='pending_config'` and canvas position.
2. The employer opens the configuration drawer for that node. They set: lifetime maximum amount (ETH), optional recurring period + period amount, optional allowed target addresses, optional per-transaction cap, and optional limited call count.
3. The employer clicks **Activate Delegation**. The delegation is signed by the company smart account using the Smart Accounts Kit. The `delegations` row is updated with `delegation_hash`, `signed_delegation`, `status='active'`, and `activated_at`.
4. The employer can revoke any active delegation at any time. Revocation cascades to all child delegations automatically.

### Viewing the full tree

The employer can see the entire company delegation tree on their canvas, including redelegations made by employees. Employee-originated delegations are shown branching from the employee node. The employer cannot modify these but can see them.

---

## The Employee Module

The employee module is a shadcn dashboard with a sidebar and React Flow canvas scoped to the employee's own delegation authority. **The canvas and redelegation flows are fully implemented.**

### Employee canvas

The permanent node on the employee canvas is their own smart account. Branching from it are the inbound delegation received from the company (visible but read-only) and any outbound redelegations the employee has created.

### Agent picker (sidebar)

Clicking an approved platform agent in the sidebar creates a new `pending_config` outbound delegation row and opens the caveat configuration drawer. The agent picker is wired and ready; it will display real agents once the Phase 6 platform agent catalog is seeded.

### Caveat configuration drawer

The employee configures spending rules for each agent delegation in a slide-out drawer with three sections:

1. **Spending Limits** — lifetime max ETH (capped at the inbound delegation limit), optional recurring period + period amount
2. **Transaction Restrictions** — per-transaction cap, limited call count
3. **Address Whitelist** — restrict recipient addresses

All values are validated client-side and again server-side against the parent inbound delegation. A child delegation cannot exceed the parent on any dimension.

### Signing flow

When the employee clicks **Sign & Activate Delegation**:

1. Caveats are saved server-side and validated against the parent delegation.
2. The agent's smart account address is resolved from the platform agent record.
3. The delegation is built and signed from the employee's injected wallet using the Smart Accounts Kit.
4. The signed delegation hash is stored and the delegation is marked `active`.

### Revocation

Employees can revoke any of their own outbound delegations. Revocation cascades to any further downstream delegations.

---

## AI Agents

AI agents are global Allocard platform agents. They are not created by employers or employees. The platform operator creates and maintains the agent catalog, and every company can delegate to the approved platform agents.

Each agent has its own smart account address and a backend-controlled signer key. The platform manages these keys; they are never exposed to the browser.

**Venice AI** acts as the reasoning and policy layer for agents:
- **Vision (`qwen3-vl`)**: Used by the Reimbursement Agent to OCR uploaded receipts and verify they match the stated claim.
- **Text reasoning**: Used for pre-spend advisory policy checks and autonomous agent claim verification.

### Committed Platform Agent

| Agent | Role | Venice responsibility | On-chain role |
|---|---|---|---|
| **Reimbursement Agent** | Reimburses employees for out-of-pocket expenses | **Vision**: OCRs receipts; verifies claim amount against caveats | Executes a native ETH transfer to the employee's wallet from the company master card |

Additional agents (Travel Agent, Procurement Agent) are stretch goals added only if time allows after the Reimbursement Agent is fully working.

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
| description | text | What the agent does |
| status | enum | enabled \| disabled |
| smart_account_address | text | Platform-deployed |
| signer_address | text | Platform-controlled signer |
| created_at | timestamp | |

### invites

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| invite_code | text unique | |
| accepted_by_user_id | uuid FK → users nullable | |
| status | enum | pending \| accepted \| expired |
| created_at | timestamp | |
| accepted_at | timestamp nullable | |

### delegations

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| parent_delegation_id | uuid FK → delegations nullable | Parent for redelegation chains |
| delegator_type | enum | company \| user \| agent |
| delegator_id | uuid | References companies, users, or agents |
| delegatee_type | enum | user \| agent \| eoa |
| delegatee_id | uuid nullable | Null when delegatee_type is eoa |
| delegatee_address | text nullable | Populated for eoa delegatees only |
| delegatee_label | text nullable | Optional label for EOA recipients |
| delegation_hash | text nullable | On-chain hash after activation |
| signed_delegation | jsonb nullable | Full signed delegation object |
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
| caveat_value | jsonb | Parameters for the caveat |
| created_at | timestamp | |

### Key schema decisions

- `delegations` uses a polymorphic pattern: `delegator_type` + `delegator_id` together identify the entity, avoiding multiple join tables.
- `caveat_value` is JSONB to accommodate the different parameter shapes across caveat types.
- Canvas positions are stored on the delegation row itself so React Flow layout persists across sessions.
- `parent_delegation_id` links child delegations to their parent for chain traversal and cascade revocation.

---

## Delegation Chain Rules

These rules are enforced in both the UI and server actions:

1. Only smart accounts can be delegators. Companies, employees, and agents all have smart accounts.
2. EOA recipients are always terminal — they cannot create further delegations.
3. An employee cannot redelegate to another employee.
4. A redelegation's caveats must be equal to or more restrictive than the parent delegation's caveats across every dimension: max amount, period amount, period frequency, per-transaction cap, target addresses, and call count.
5. The employer cannot redelegate on behalf of employees. Employees manage their own redelegations from their own module.
6. Employers and employees cannot create agents; they can only delegate to approved platform agents.
7. Revoking a parent delegation invalidates all child delegations in the chain. This cascades automatically in the `delegations` table via `getDescendantDelegationIds`.

---

## Implementation Status

### Complete

| Phase | Scope |
|---|---|
| Phase 1 | Project foundation, Drizzle + Neon schema, migration applied |
| Phase 2 | Wallet auth, employer signup, invite creation, employee invite acceptance, role-based routing |
| Phase 3 | Employer dashboard shell — sidebar, summary cards, React Flow delegation tree, canvas persistence |
| Phase 4 | Employer delegation configuration drawer, caveat entry, smart account signing, activation, revocation |
| Phase 5 | Employee redelegation — agent picker, caveat drawer, parent/child caveat validation, browser signing flow, revocation |
| Phase 6 | AI agents and Venice AI — Reimbursement, Travel, and Procurement agents; Venice text + vision integration; employee wallet spend tab; agent drawers; `claim_redemptions`, `agent_bookings`, `manual_transactions` audit tables |

### In Progress / Upcoming

| Phase | Scope |
|---|---|
| Phase 6 (remaining) | Platform agent catalog seed data; employee sidebar wired to live agents |
| Phase 7 | Observability, security, production readiness, deployment documentation |

### Key server actions (`app/actions/identity.ts`)

| Action | Description |
|---|---|
| `getWalletProfile` | Resolves role + company from connected wallet address |
| `createEmployer` | Creates user + company records on signup |
| `createInvite` | Generates an invite link for an employee |
| `getInviteDetails` | Looks up company from an invite code |
| `acceptInvite` | Creates employee user record and links to company |
| `getCompanyDashboardState` | Full employer dashboard state (company, employees, delegations, caveats, agents, summary) |
| `createEmployeeDelegation` | Creates a `pending_config` delegation row from the employer to an employee or EOA |
| `saveDelegationCaveats` | Persists employer-configured caveat rows |
| `activateDelegation` | Signs and activates a company→employee/EOA delegation |
| `revokeDelegation` | Revokes a delegation and all descendants |
| `getEmployeeDashboardState` | Full employee dashboard state (inbound delegation, outbound redelegations, summary) |
| `createAgentRedelegation` | Creates a `pending_config` delegation row from the employee to an agent |
| `saveEmployeeRedelegationCaveats` | Persists employee caveat rows with parent/child validation |
| `activateEmployeeDelegation` | Signs and activates an employee→agent delegation |
| `revokeEmployeeDelegation` | Revokes an employee's own outbound delegation and all descendants |
| `getAgentSmartAccountAddress` | Resolves an agent's smart account address from its UUID |

---

## What is Not Yet Implemented

- Signed session/cookie middleware. Current route protection depends on connected wallet state in the browser.
- Platform agent catalog seeded in the database. The schema, server actions (`getAgentSmartAccountAddress`, `createAgentDelegation`, `createAgentRedelegation`), and all agent API routes (`/api/agents/reimbursement/claim`, `/api/agents/travel/*`, `/api/agents/procurement/*`) are fully implemented. The actual agent rows need to be inserted via a seed script.
- Employee sidebar agent list wired to live data. Currently passes an empty array so only placeholder agents show; will be wired once `getEmployeeDashboardState` returns the seeded catalog.
- Real-time canvas updates. Currently requires a manual refresh.
- Multi-token support. MVP is native Base Sepolia ETH only.
- Business-logic tests beyond the current smoke test.
- Production deployment documentation.
