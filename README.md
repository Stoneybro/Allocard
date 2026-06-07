# Allocard — Project Specification

## What is Allocard?

Allocard is a trustless corporate expense card system built on MetaMask Smart Accounts. It allows companies to give employees and AI agents spending authority over company funds without ever transferring those funds to them. The core mechanism is MetaMask's delegation framework — a company delegates the right to spend from its smart account, enforcing rules through on-chain caveats, rather than moving money and hoping it is spent correctly.

The problem Allocard solves is a fundamental one in corporate finance: when a company issues an expense card, it is relying entirely on employee integrity. Allocard makes this system trustless. An employee can only spend what the caveat rules allow — the enforcement is on-chain, not policy-based.

The project was built for the MetaMask hackathon and satisfies the requirements for both the Smart Accounts track (delegation, redelegation) and the A2A coordination track (employer-to-agent and employee-to-agent delegation chains).

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

Redelegation is when a delegatee re-issues a new delegation from the authority they received. In Allocard, this means an employee who has been delegated spending authority can redelegate a portion of that authority to an AI agent. The chain looks like this:

```
Company smart account → Employee smart account → AI agent smart account
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

1. The accounting team visits Allocard and signs up. They connect via MetaMask Embedded Wallets, providing their company name.
2. A `users` row is created with `role='employer'` and a `companies` row is created with the company name and a generated unique invite code.
3. The employer is taken to their dashboard. The master card node is shown on the canvas in a concealed state (displaying `**** ****` like a real card before activation).
4. The employer clicks to activate the card. This deploys the company's smart account on-chain and writes the resulting address back to `companies.smart_account_address`. The card on the canvas is now revealed with the real smart account address.

### Employee onboarding

1. The employer generates an invite link from their dashboard. An `invites` row is created with `status='pending'`.
2. The employee clicks the invite link. The invite code in the URL is validated against the `invites` table to find the correct company. This link is only required for first-time onboarding; after acceptance, the employee's `company_id` persists on their user record and future visits can route directly to the employee dashboard.
3. The employee signs up via MetaMask Embedded Wallets. A `users` row is created with `role='employee'` and `company_id` set to the company from the invite. The employee's smart account is deployed at this point. The `invites` row is updated to `status='accepted'`.
4. The employee's profile now appears in the employer's contact list in the sidebar, making them available to drag onto the delegation canvas.

---

## The Employer Module

The employer module is a shadcn-styled dashboard with a sidebar and a main canvas area.

### Sidebar

The sidebar contains two lists: employees and AI agents. These are the potential recipients of delegation. Each item can be clicked or dragged onto the canvas. There is a visual distinction between employee items and agent items.

### Canvas

The canvas is built with React Flow. It has a permanent node representing the company's master card (styled to look like a physical corporate card). All delegation relationships branch out from this node as a tree.

Above the canvas, there are summary cards showing: number of employees, number of active delegations, number of active agents, and total delegated funds.

### Delegation flow on the employer canvas

1. The employer drags a recipient (employee or agent) from the sidebar onto the canvas. A new node appears in a `pending_config` state. A `delegations` row is inserted with `status='pending_config'` and the canvas position.
2. The employer opens the configuration drawer (slides in from the right, shadcn Drawer component) for that node. They configure the delegation caveats — at minimum: token type, maximum amount, and period if recurring. Caveat rows are written to `delegation_caveats`.
3. The employer clicks Activate on the node. The delegation is created and signed on-chain using the Smart Accounts Kit. The `delegations` row is updated with the `delegation_hash` and `status='active'`.

### Viewing the full tree

The employer can see the entire company delegation tree on their canvas, including redelegations made by employees. Employee-originated delegations are shown branching from the employee node. The employer cannot modify these but can see them.

### EOA delegation from employer canvas

The employer can also delegate to an external address (EOA) directly from the canvas. There is an "Add address" option that accepts a raw wallet address and an optional label. EOA nodes are visually distinct and have no further branching — they are always terminal.

### Limitations on the employer canvas

If the employer has delegated to an employee, the employer cannot extend that delegation further on their own canvas. Only the employee can redelegate from their own module. AI agent nodes are different: since the platform controls the agent's signing key, the employer can redelegate on behalf of agents they own.

---

## The Employee Module

The employee module is structurally similar to the employer module — a shadcn dashboard with a sidebar and React Flow canvas — but scoped to the employee's own delegation authority.

### Association with employer

When an employee signs up via an invite link, their `company_id` is set automatically. The employee module loads their company's information from this relationship. There is no manual employer lookup required after onboarding.

### Employee canvas

The permanent node on the employee canvas is their own smart account address (not a card metaphor — just their account node). Branching from it are any redelegations they have made to agents or EOA addresses.

The employee can see the delegation they received from the company but cannot modify it. They can only redelegate from their own authority.

### Redelegation from employee canvas

The employee can redelegate to AI agents (from the company's agent list) or to EOA addresses. The caveat configuration must be equal to or more restrictive than the parent delegation from the company. If the parent delegation allows $500/month in USDC, the employee cannot redelegate $600/month. This is enforced both in the UI (capped inputs) and on-chain by the Delegation Manager.

### EOA delegation from employee canvas

Same as the employer — the employee can add a raw wallet address with an optional label for one-time payments. EOA nodes are terminal and cannot redelegate.

---

## AI Agents

AI agents are smart accounts deployed by the platform on behalf of a company. Each agent has its own smart account address and a backend-controlled signer key. The platform manages these keys; they are not exposed to the employer.

Agents are named entities in the system (e.g. "Procurement Agent", "Travel Agent"). They are listed in the sidebar of both the employer and employee modules and can be delegated to like any other recipient.

Because the platform controls the agent's signing key, agents can be used to execute on-chain transactions automatically within the bounds of their caveats. This is the A2A coordination story: an employer or employee delegates to an agent, and the agent autonomously redeems the delegation to make purchases or payments without human approval for each transaction.

The employer owns any agents they create. Agents belong to a company via `company_id` in the `agents` table.

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
| company_id | uuid FK → companies | |
| smart_account_address | text | Platform-deployed |
| backend_signer_address | text | Platform-controlled signer |
| created_at | timestamp | |

### invites

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| invite_code | text unique | |
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
6. The employer can redelegate on behalf of agents they own, because the platform controls the agent's signing key.
7. Revoking a parent delegation invalidates all child delegations in the chain. This must be reflected in the `status` field of all affected `delegations` rows.

---

## UI Framework and Design

The application uses shadcn as the primary UI component library. The layout for both modules follows a standard shadcn dashboard pattern: a fixed sidebar on the left containing navigation and recipient lists, and a main content area to the right containing the React Flow canvas and the summary cards above it.

The React Flow canvas is the primary interactive surface of the application. Node types are:

- Master card node (employer module only) — styled to look like a physical corporate card. Shows `**** ****` before activation, real address after.
- Employee nodes — distinct visual style, purple-toned.
- Agent nodes — distinct visual style, coral-toned, visually different from employee nodes.
- EOA nodes — minimal style, terminal indicator, no branching UI.

Configuration for a delegation node is done via a shadcn Drawer component that slides in from the right side of the screen. This preserves canvas context while the user configures caveats.

---

## What is Not Yet Fully Specified

The following areas were flagged during planning and will need to be worked out during implementation:

- Open delegation usage, if any, and how it appears in the canvas UI.
- The exact mechanism by which agents autonomously redeem delegations (what triggers them, how they authenticate their backend signer, what the agent runtime looks like).
- How the employer canvas handles real-time updates when an employee creates a redelegation (polling, websockets, or manual refresh).
- Paused delegation status — what triggers a pause vs a revoke, and whether pausing is employer-initiated or automatic.
