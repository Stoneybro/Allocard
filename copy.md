# Allocard UI Copy Reference

This document provides a comprehensive list of all UI copy found in the Allocard application, organized by page, area, and section.

## 1. Landing Page (`apps/web/app/page.tsx`)

| Area | Section | Copy |
| :--- | :--- | :--- |
| Navigation | Logo | Allocard |
| Navigation | Links | Read the Docs |
| Navigation | Button | Try the Demo / Loading... |
| Hero | Subtitle | MetaMask Hackathon 2025 |
| Hero | Main Heading | Revolutionizing Corporate Expense Cards. |
| Hero | Description | Give employees, external contractors, and AI agents the exact spending permissions they need, without ever transferring company funds. Allocard utilizes MetaMask Smart Accounts to let you delegate, redelegate, and visually monitor trustless spending authority across your entire organization. |
| Hero | CTA Buttons | Try the Demo, Read the Docs |
| Hero | Placeholder | Illustration — Coming Soon |
| How It Works | Subtitle | How It Works |
| How It Works | Title | Minimizing Trust with MetaMask Delegation |
| How It Works | Description | The traditional corporate card model is broken: you issue funds to an employee and rely on company policy to prevent misuse. Allocard completely removes the need for trust. Instead of moving money, your capital remains securely in a central company Smart Account. |
| How It Works | Feature 1 | **Capital stays put:** Funds remain in the company Smart Account — never pre-loaded onto a card. |
| How It Works | Feature 2 | **On-chain caveats:** Rules like spending caps and allowed addresses are enforced by the Delegation Manager contract. |
| How It Works | Feature 3 | **Zero policy reliance:** Invalid transactions are rejected at the protocol level, not after the fact. |
| Canvas Section | Title | The Delegation Canvas |
| Canvas Section | Description | Managing complex on-chain permissions shouldn't require writing code. We turned the ERC-7710 delegation standard into a premium, intuitive drag-and-drop experience. |
| Coordination | Title | Deep Redelegation & A2A Coordination |
| Coordination | Use Case 1 | **Company → Employee → AI Agent:** An employee delegates $500 of their $2,000 monthly travel budget to an AI agent to autonomously book flights. |
| Coordination | Use Case 2 | **Company → AI Agent → Employee:** A specialized smart contract agent manages a departmental budget, programmatically distributing spending limits to staff based on performance. |
| Tech Stack | Title | Under the Hood |
| Tech Stack | Tech 1 | **Zero Traditional Auth:** Fully passwordless onboarding via MetaMask Embedded Wallets. |
| Tech Stack | Tech 2 | **Smart Accounts by Default:** Every company, employee, and AI agent operates an ERC-4337 Smart Account, which is required to act as a delegator in the network. |
| Final CTA | Title | Explore the future of trustless corporate spending. |
| Footer | Text | Built for the MetaMask Hackathon · Trustless corporate spending powered by ERC-7710 & ERC-4337. |

## 2. Onboarding & Authentication

### Onboarding Page (`apps/web/app/onboarding/page.tsx`)

| Area | Section | Copy |
| :--- | :--- | :--- |
| Header | Status | Connected wallet |
| Header | Title | Set up your Allocard workspace |
| Header | Description | Create a company account or use an invite link from your company to join as an employee. |
| Create Company | Title | Create a company |
| Create Company | Description | Start as the company owner and manage employee spending permissions. |
| Create Company | Input Label | Company name |
| Create Company | Placeholder | Acme Labs |
| Create Company | Button | Create company / Creating company... |
| Join Employee | Title | Join as an employee |
| Join Employee | Description | Employees join Allocard through an invite link from their company. |
| Join Employee | Button | I am an employee |
| Join Employee | Tooltip/Hint | Ask your company admin to send you an Allocard invite link. Open that link once with this wallet to join the right company. |
| Feedback | Error | Company setup failed |

### Invite Page (`apps/web/app/invite/[inviteCode]/InviteClient.tsx`)

| Area | Section | Copy |
| :--- | :--- | :--- |
| Content | Status | Employee invite |
| Content | Title | Join {companyName} |
| Content | Description | This will link your connected wallet to the company as an employee. You only need this invite once. |
| Content | Button | Join company / Joining company... |
| Feedback | Error | Invite not found / This invite link is invalid or has been removed. |
| Feedback | Error | This invite has expired. Ask your company admin for a new link. |
| Feedback | Error | This invite has already been accepted. If it was accepted with this wallet, continuing will take you to your employee dashboard. |

### Global Auth Components (`apps/web/components/auth-state.tsx`)

| Area | Section | Copy |
| :--- | :--- | :--- |
| Card | Title | Connect your wallet / Join {companyName} |
| Card | Description | Authenticate with MetaMask Embedded Wallets to continue. / Connect the wallet you want to use as your employee identity. |
| Card | Button | Connect wallet / Connecting... |
| Loading | State | Loading your workspace... |

## 3. Employer Dashboard (`apps/web/app/employer/EmployerClient.tsx`)

| Area | Section | Copy |
| :--- | :--- | :--- |
| Shell | Title | Company dashboard |
| Shell | Role | Company owner |
| Shell | Loading | Loading company workspace... / Checking access... |
| Stats Cards | Employees | Employees |
| Stats Cards | Agents | AI Agents |
| Stats Cards | Delegations | Active delegations |
| Stats Cards | ETH | Delegated ETH |
| Tabs | Titles | Delegation Canvas, Activity Log |
| Activity | Title | Employer Activity Log |
| Activity | Description | A unified view of all direct employee spends, agent bookings, and reimbursements within your company. |

### Spending Rules Drawer (`apps/web/app/employer/EmployerClient.tsx`)

| Area | Section | Copy |
| :--- | :--- | :--- |
| Header | Title | Spending Limits & Rules |
| Header | Description | Configure exactly what this delegatee is allowed to do with the company's funds. |
| Header | Description (Active) | These rules are currently active and enforced on-chain. |
| Section 1 | Title | 1. Overall Spending Limits |
| Section 1 | Limit Label | Lifetime Spending Limit (ETH) |
| Section 1 | Limit Hint | The absolute maximum amount of ETH this delegatee can spend in total over the lifetime of this delegation. |
| Section 1 | Period Label | Recurring Allowance |
| Section 1 | Period Options | None, Hourly, Daily, Weekly, Monthly |
| Section 1 | Period Hint | Automatically reset their spending limit on a recurring schedule. |
| Section 1 | Allowance Label | Allowance per Period (ETH) |
| Section 1 | Allowance Hint | How much they can spend within the selected timeframe. |
| Section 2 | Title | 2. Transaction Restrictions |
| Section 2 | Per-Tx Label | Maximum Per-Transaction (ETH) |
| Section 2 | Per-Tx Hint | The most they can spend in any single transaction. Leave blank for no per-transaction cap. |
| Section 2 | Tx Limit Label | Limit Total Transactions |
| Section 2 | Tx Limit Hint | Restrict the delegatee to a specific number of total transactions. |
| Section 3 | Title | 3. Address Whitelist |
| Section 3 | Addresses Label | Permitted Addresses |
| Section 3 | Addresses Hint | Only allow sends to these addresses. Leave blank to allow any destination (less secure). |
| Section 3 | Placeholder | One address per line or comma-separated |
| Section 4 (Agents) | Title | 4. AI Policy Prompt |
| Section 4 (Agents) | Policy Label | Natural Language Rules |
| Section 4 (Agents) | Policy Hint | These rules will be fed to the AI Agent to evaluate claims. The hard on-chain limits above still apply as a security net. |
| Section 4 (Agents) | Placeholder | e.g. Do not reimburse alcohol. Limit meals to $50. Flights must be economy. |
| Footer | Button | Activate delegation / Sign & Activate Delegation |

## 4. Employee Dashboard (`apps/web/app/employee/EmployeeClient.tsx`)

| Area | Section | Copy |
| :--- | :--- | :--- |
| Shell | Title | Employee dashboard |
| Shell | Role | Employee |
| Shell | Banner | Smart account not yet activated. Activate your smart account so the company can delegate spending authority to you. |
| Stats Cards | Approved | Approved Limit |
| Stats Cards | Redelegated | Redelegated |
| Stats Cards | Remaining | Remaining Authority |
| Stats Cards | Agents | Active AI Agents |
| Tabs | Titles | Delegation Canvas, Wallet & Direct Spend |
| Wallet Tab | Title | Manual Spend |
| Wallet Tab | Description | Spend directly from your delegated wallet. Your intended purpose will be checked against the company policy by Venice AI. |

## 5. Manual Spend Flow (`apps/web/app/employee/DirectSpendForm.tsx`)

| Area | Section | Copy |
| :--- | :--- | :--- |
| Step 1: Input | Labels | To Address, Amount (ETH), Purpose |
| Step 1: Input | Placeholders | 0x..., 0.01, e.g. Client dinner at Dorsia |
| Step 1: Input | Button | Review Spend |
| Step 2: Eval | Status | Venice AI evaluating policy... |
| Step 3: Review | Labels | To:, Amount:, Purpose: |
| Step 3: Review | Compliant | Compliant with Policy |
| Step 3: Review | Violation | Policy Violation Flagged |
| Step 3: Review | Violation Hint | You may proceed, but this transaction will be flagged for employer review. |
| Step 3: Review | Buttons | Back, Execute Spend |
| Step 4: Exec | Status | Executing on-chain via Bundler... |
| Step 5: Success | Title | Transaction Successful |
| Step 5: Success | Tx Hash Label | Tx Hash: |
| Step 5: Success | Upload Title | Upload Receipt (Optional) |
| Step 5: Success | Upload Description | Provide a receipt for Venice AI to verify against your stated purpose. |
| Step 5: Success | Buttons | Submit Receipt, Skip for now |
| Step 6: Done | Title | All Done! |
| Step 6: Done | Description | Your transaction and receipt have been logged. |
| Step 6: Done | Button | New Spend |

## 6. AI Agent Drawers

### Procurement Agent (`apps/web/app/employee/ProcurementAgentDrawer.tsx`)

| Area | Section | Copy |
| :--- | :--- | :--- |
| Header | Title | Procurement Agent |
| Header | Description | Request software subscriptions. The AI will find the best vendor and check for duplicate tools. |
| Input | Labels | Tool Category, Team Size, Additional Requirements |
| Input | Button | Research Options |
| Result | Title | Proposed Subscription |
| Result | Button | Approve & Procure |
| Success | Title | Subscription Procured! |

### Reimbursement Agent (`apps/web/app/employee/ReimbursementAgentDrawer.tsx`)

| Area | Section | Copy |
| :--- | :--- | :--- |
| Header | Title | Submit Reimbursement Claim |
| Header | Description | The Reimbursement AI Agent will review your claim against the company policy. |
| Input | Labels | What was the expense?, Amount (ETH), Receipt (Optional) |
| Input | Button | Submit Claim |
| Status | Evaluating | Agent reviewing claim... |

### Travel Agent (`apps/web/app/employee/TravelAgentDrawer.tsx`)

| Area | Section | Copy |
| :--- | :--- | :--- |
| Header | Title | Travel Agent |
| Header | Description | Request a trip. The AI will research options and book within your approved budget. |
| Input | Labels | Destination, Departure Date, Return Date, Additional Notes |
| Input | Button | Find Best Options |
| Result | Title | Recommended Itinerary |
| Result | Button | Book Trip |

## 7. Navigation & Sidebar (`apps/web/components/app-sidebar.tsx`)

| Area | Section | Copy |
| :--- | :--- | :--- |
| Header | Label | Workspace |
| Header | Value | Your Workspace |
| Section 1 | Main | Canvas, Activity Log, Wallet |
| Section 2 | Manage | Invite: Send a one-time link to onboard an employee. |
| Section 3 | Agents | Recipients / Your AI Agents |
| Section 3 | Placeholder | Expense Reviewer, Budget Guard, Approval Bot |
| Footer | User | Settings, Log out |

## 8. Shared UI Elements

### Smart Account Button (`apps/web/components/smart-account-activation-button.tsx`)

| State | Copy |
| :--- | :--- |
| Initial | Activate Smart Account |
| Activating | Activating... |
| Initialized | Deploying Wallet... |
| Active | Smart Account Active |

### Empty States & Errors

| Context | Copy |
| :--- | :--- |
| Access | Checking access... |
| Wallet | Smart account pending |
| Balance | Exceeds available balance. Max you can delegate: {balance} ETH. |
| Validation | Enter a valid ETH amount (e.g. 0.05). |
| Validation | Spending limit must be greater than 0. |
| Validation | No addresses specified — the delegatee can send to any address. |
