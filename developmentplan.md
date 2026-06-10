# Allocard Development Plan

## Current Understanding

Allocard is intended to be a trustless corporate expense card system built around MetaMask Smart Accounts. Companies keep custody of funds in a company smart account and grant constrained spending authority to employees, AI agents, or external wallet addresses through signed delegations and on-chain caveats. Employees can redelegate a subset of their authority to AI agents or EOAs, while the caveat rules prevent spending outside the approved policy.

The intended product has two primary modules:

- Employer module: company onboarding, master card activation, employee invites, platform agent selection, delegation tree management, caveat configuration, activation, revocation, and full-tree visibility.
- Employee module: employee onboarding through invites, viewing received authority, redelegating to agents or EOAs, and managing only delegations created from the employee's authority.

The current codebase is a Next.js app with Phase 1 database setup and Phase 2 wallet-based onboarding in place. It can resolve connected wallets, create employer/company records, generate invite links, accept employee invites, and route users to role-specific dashboards. The initial Drizzle migration has been applied to Neon. Delegation configuration, smart account activation in the dashboard, and agent execution still belong to later phases.

## Current Codebase State

Implemented or partially implemented:

- Next.js app under `apps/web`.
- shadcn-based dashboard shell with role-specific employer and employee pages.
- Phase 3 dashboard assets exist and should be refactored instead of deleted:
  - `components/section-cards.tsx`
  - `components/dashboard-flow-canvas.tsx`
- MetaMask Embedded Wallet / Web3Auth provider configuration.
- Wagmi and React Query provider setup mounted in `app/layout.tsx`.
- Drizzle schema and initial Neon PostgreSQL migration. The current migration file is `apps/web/drizzle/0000_perpetual_big_bertha.sql`.
- Wallet-based user lookup, employer onboarding, invite creation, invite acceptance, and role-aware client routing.
- Smart account helper code using `@metamask/smart-accounts-kit`, Viem, Base Sepolia, bundler, and paymaster configuration.
- `WalletDashboard.tsx` can connect a wallet and attempt smart account deployment, but it is not wired into the active dashboard page.

Not implemented yet:

- Signed session/cookie middleware; current routing depends on connected wallet state in the browser.
- Smart account activation wired into the employer/employee dashboards.
- Drag-and-drop recipient creation on the canvas.
- Canvas persistence.
- Delegation configuration drawer.
- Delegation creation, signing, storage, redemption, or revoke flows.
- Caveat generation and validation.
- Redelegation rules and parent/child delegation constraints.
- AI agent runtime or backend signer management.
- Real dashboard metrics.
- Business-logic tests beyond the current smoke test.
- Production deployment documentation.

## Phase 1: Project Foundation and Product Alignment

Goal: turn the scaffold into a coherent app baseline before adding deeper product behavior.

Steps:

1. Clean up project metadata.
   - Rename root package metadata from the generic `delegate` name if this repo is meant to be Allocard.
   - Decide whether commands should be run from the root workspace or `apps/web`, then document that consistently.
   - Add useful root scripts such as `dev`, `build`, `lint`, and later `test` that delegate to `apps/web`.

2. Replace placeholder README content.
   - Keep the top-level README as the product specification.
   - Replace `apps/web/README.md` with app-specific setup instructions.
   - Document required environment variables:
     - `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID`
     - `NEXT_PUBLIC_BUNDLER_RPC_URL`
     - `NEXT_PUBLIC_PAYMASTER_RPC_URL`
     - `NEXT_PUBLIC_PIMLICO_SPONSOR_ID` if required
     - Database connection variables once chosen
   - Document the target chain, currently Base Sepolia.

3. Mount Web3 providers correctly.
   - Wrap the app with `Web3Providers` in `app/layout.tsx` or a client provider boundary.
   - Confirm `WalletDashboard.tsx` can run without provider errors.

4. Decide the backend/database approach.
   - Pick the database platform and ORM/query layer.
   - The README describes a relational schema; PostgreSQL is the natural fit.
   - Create migrations for `companies`, `users`, `agents`, `invites`, `delegations`, and `delegation_caveats`.

5. Add basic quality gates.
   - Keep `pnpm lint` passing.
   - Add type-checking script.
   - Add a basic test framework once business logic starts moving out of UI components.

Acceptance checkpoint:

- A new developer can install dependencies, create `.env.local`, run the app, connect a wallet, and understand what is real versus placeholder.
- The app has a mounted provider tree and no unused standalone Web3 demo path.

## Phase 2: Authentication, Roles, and Onboarding

Goal: implement the identity foundation that every delegation flow depends on.

Status: complete.

Steps:

1. Define the authenticated user lifecycle.
   - Map MetaMask Embedded Wallet identity to `users.embedded_wallet_address`.
   - Map connected wallet identity to an Allocard user without requiring email.
   - Create server-side helpers for loading the current user.

2. Build employer signup.
   - Collect company name.
   - Create `users` row with `role='employer'`.
   - Create `companies` row with owner relationship and invite code.
   - Start with `companies.smart_account_address = null`.

3. Route existing connected wallets.
   - Employer wallets route to `/employer`.
   - Employee wallets route to `/employee`.
   - New wallets route to `/onboarding`.

4. Build invite creation.
   - Employer can create invite links.
   - Insert `invites` rows with `pending` status.
   - Show a copyable invite link in a modal; the invite link is only needed for first-time employee association.

5. Build employee signup through invite.
   - Validate invite code.
   - Create `users` row with `role='employee'` and `company_id`.
   - Mark invite as accepted with `accepted_at` and `accepted_by_user_id`.
   - Route future visits by wallet identity instead of requiring the invite link again.

Acceptance checkpoint:

- Employers and employees can be created through the intended flows.
- Invite links are only needed for first-time employee association.
- The app knows which dashboard a connected user should see.
- Existing employer wallets route to `/employer`; existing employee wallets route to `/employee`; new connected wallets route to `/onboarding`.
- Employees who open `/invite/[inviteCode]` are linked to the invite's company through `users.company_id`.
- Invites record `accepted_at` and `accepted_by_user_id`.

## Phase 3: Employer Dashboard MVP

Goal: convert the Phase 2 employer shell into a real read-only employer workspace while preserving and refactoring the restored dashboard assets. Phase 3 displays the company state and delegation tree shape; creation, caveat editing, activation, and drag persistence remain Phase 4.

Implemented Phase 3 scope:

- `/employer` remains guarded by connected-wallet role lookup in the browser.
- The employer dashboard now loads a consolidated company dashboard state with company, employees, delegations, caveats, and summary metrics.
- Invite creation moved into the sidebar.
- Employee recipients moved into the sidebar.
- Agent recipients were deferred out of the employer canvas/sidebar until Phase 6. The schema still contains agents, but current employer delegation UI supports employees and EOAs only.
- Embedded wallet/signer addresses are no longer primary dashboard UI; the sidebar and account footer show smart account status/address because the smart account is the funded/delegating account.
- `components/section-cards.tsx` was retained and refactored into Allocard summary cards.
- `components/dashboard-flow-canvas.tsx` was retained and refactored into a typed React Flow delegation tree.

Steps:

1. Keep and harden dashboard routing.
   - Use `/employer` for the employer workspace.
   - Use `/employee` for the employee workspace.
   - Keep role redirects based on wallet profile in the browser.
   - Defer middleware until signed sessions/cookies exist.

2. Finish employer sidebar content.
   - Show the company name and company smart account status/address.
   - Remove generic navigation that is not part of the Allocard dashboard.
   - Show invite creation in the sidebar.
   - Show employees from the database in a recipient list that can later be dragged to the canvas.
   - Defer AI agent recipients until Phase 6.

3. Refactor `SectionCards` into real employer summary cards.
   - Use 4 cards to keep the dashboard compact.
   - Use to display the number of employees, active delegations, active agents, and total delegated native ETH allowance.
   

4. Refactor `DashboardFlowCanvas` into the employer delegation tree.
   - Master card node.
   - Employee node.
   - EOA node.
   - Pending configuration state.
   - Active and revoked visual states.
   - Initially load the company root node and employee nodes even before delegation activation exists.
   - Load stored delegation edges from the database.

5. Load canvas positions.
   - Use `delegations.canvas_position_x` and `delegations.canvas_position_y` for stored delegation nodes.
   - Derive deterministic positions for available employees that do not yet have delegation rows.
   - Defer drag/drop placement and position persistence to Phase 4, where delegation rows are created.

Acceptance checkpoint:

- Employer dashboard reflects real company state.
- Employer can create invite links from the sidebar.
- Employer can see company card, employees, EOAs, and stored delegation relationships on the canvas.
- Main content contains the summary cards and primary canvas only.

## Phase 4: Delegation Configuration and Activation

Goal: make employer-created delegations real and interactive.

Steps:

Implemented Phase 4 scope:

- Employee recipients can be clicked or dragged from the sidebar onto the React Flow canvas.
- EOAs can be added from the sidebar with address validation and an optional label.
- New delegation rows are created with `pending_config` status and initial canvas positions.
- Dragged delegation node positions are persisted to `delegations.canvas_position_x/y`.
- The configuration drawer supports native ETH max amount, recurring period amount, allowed targets, redeemers, limited call count, per-transaction cap, and one custom caveat enforcer.
- Caveats are stored in `delegation_caveats.caveat_value` with wei values serialized as decimal strings.
- Employer activation builds a MetaMask Smart Accounts Kit delegation, signs it from the company smart account, stores `delegation_hash`, stores the full signed delegation in `delegations.signed_delegation`, and marks the delegation `active`.
- Revocation marks the selected delegation and descendant delegations `revoked`.
- Agent recipients are intentionally excluded from the Phase 4 employer canvas and sidebar until Phase 6.

Acceptance checkpoint:

- Employer can create a configured delegation to an employee or EOA.
- The delegation is signed, stored, and reflected as active in the UI.
- Canvas positions persist across sessions after node placement or movement.
- Invalid or incomplete caveat configurations cannot be activated.

## Phase 5: Employee Redelegation

Goal: allow employees to redelegate only within the authority granted by the company.

Steps:

1. Build employee dashboard.
   - Show employee smart account as the root node.
   - Show the active delegation received from the company.
   - Show employee-created child delegations.

2. Enforce redelegation target rules.
   - Allow redelegation to approved platform agents.
   - Allow redelegation to EOAs.
   - Block redelegation to other employees.
   - Treat EOAs as terminal nodes.

3. Implement caveat restriction comparison.
   - Build shared validation that compares child caveats against parent caveats.
   - Enforce max amount cannot exceed parent.
   - Enforce period cannot be more permissive than parent.
   - Enforce targets/methods/calldata cannot broaden parent permissions.
   - Enforce limited call counts cannot exceed parent when applicable.

4. Implement employee delegation signing.
   - Employee signs redelegations from their smart account.
   - Store parent delegation relationship if needed; the current README schema does not explicitly include `parent_delegation_id`, so this must be added or otherwise modeled.

Acceptance checkpoint:

- Employee can create valid redelegations to agents or EOAs.
- Invalid redelegations are blocked in UI and server logic.
- Employer can see employee-originated redelegations in the full company tree.

## Phase 6: AI Agents and A2A Coordination

Goal: implement the platform-owned agent story beyond static sidebar entries, with Venice AI as the reasoning layer and MetaMask Smart Accounts Kit delegations as the execution permission layer.

Product decision:

- Agents are global Allocard platform agents, not company-created agents.
- Employers and employees can delegate to approved platform agents, but they cannot create or modify the agent catalog.
- Each agent has a platform-controlled smart account and backend signer. The signer is never exposed to employers, employees, or the browser.
- Agents can participate as both delegatees and delegators, enabling chains such as:
  - Company → Agent → Employee
  - Employee → Agent → Agent
  - Company → Agent → Employee → Agent
- 1Shot API is intentionally out of scope for the MVP to keep the architecture focused on MetaMask Smart Accounts Kit, redelegation, and Venice-powered agent behavior.

Steps:

1. Redefine agent ownership and lifecycle.
   - Replace company-owned agents with a platform agent catalog.
   - Only the platform operator can seed or administer agents.
   - Store agent name, role, description, status, smart account address, backend signer address, and Venice model/tool configuration.
   - Keep company-specific authority in `delegations`, not in the agent record itself.

2. Define backend signer key management.
   - Decide where signer keys live.
   - Ensure private keys are never exposed to the browser.
   - Add rotation and environment separation guidance.

3. Define Venice-powered agent reasoning.
   - Use Venice to interpret expense requests, classify spend category, evaluate policy context, and produce a structured transaction intent.
   - Persist the Venice prompt, structured output, confidence, and reasoning summary in the audit log.
   - Treat Venice output as advisory. Caveats and server-side validation decide whether execution is allowed.

4. Build delegation redemption service.
   - Agent process selects an active delegation or redelegation.
   - Builds transaction intent from either a user request or Venice-generated plan.
   - Validates the intent against stored caveats before submission.
   - Redeems through Delegation Manager.
   - Records redemption result in the database.

5. Add A2A delegation support.
   - Allow company → agent delegations.
   - Allow employee → agent redelegations.
   - Allow agent → agent redelegations when the active parent delegation and caveats permit it.
   - Allow company → agent → employee workflows for controlled routing through a platform agent.
   - Preserve parent/child caveat restriction checks for every redelegation hop.

6. Add agent controls and visibility.
   - Agent enable/disable.
   - Agent catalog visibility in employer and employee sidebars.
   - Spending logs.
   - Failure states.
   - Clear indication of which caveats constrain each agent.
   - Clear indication of which Venice output led to each proposed or executed action.

Acceptance checkpoint:

- An agent can redeem a valid delegation using a backend-controlled signer.
- Venice AI is used in the main agent flow to produce a meaningful expense decision, classification, or transaction intent.
- Employers can audit what the agent did, which delegation authorized it, which caveats constrained it, and what Venice produced before execution.
- The demo can show at least one multi-hop A2A chain, ideally Company → Agent → Employee → Agent or Employee → Agent → Agent.

## Phase 7: Observability, Security, and Production Readiness

Goal: make the system reliable enough for a hackathon demo first, then production hardening.

Steps:

1. Add transaction and delegation audit logs.
   - Record who initiated each action.
   - Record delegation hash, status changes, and redemption attempts.
   - Store chain transaction hashes where applicable.

2. Add tests around critical logic.
   - Caveat conversion.
   - Parent/child caveat restriction validation.
   - Role authorization.
   - Invite acceptance.
   - Revocation cascade behavior.

3. Harden environment handling.
   - Fail loudly for missing required env vars only in contexts that need them.
   - Avoid throwing during server render for client-only wallet requirements.
   - Document devnet/testnet/mainnet differences.

4. Improve UX for async blockchain actions.
   - Loading states.
   - Retry states.
   - Clear transaction hash links.
   - Clear error messages for bundler, paymaster, and chain failures.

5. Prepare deployment.
   - Vercel or chosen host setup.
   - Database migrations in deployment flow.
   - Environment variable checklist.
   - Demo seed data or guided demo flow.

Acceptance checkpoint:

- The app has a reliable demo path from employer signup to delegation activation to employee redelegation.
- Core rules have automated coverage.
- Deployment steps are documented.

## README and Specification Gaps to Resolve

These gaps should be resolved as implementation decisions are made:

1. Database stack is unspecified.
   - The schema is described, but the implementation tool is not chosen.

2. Parent-child delegation modeling is incomplete.
   - Redelegation needs an explicit way to link a child delegation to its parent. Add `parent_delegation_id` or document the alternative.

3. Auth/session architecture is unspecified.
   - The README says users authenticate with MetaMask Embedded Wallets, but it does not define how the app persists sessions or protects server routes.

4. Web3 provider wiring is missing from the active app.
   - The README should explain how Web3Auth, Wagmi, Smart Accounts Kit, bundler, and paymaster fit together.

5. Agent runtime is speculative.
   - The README should specify how agents decide what to execute, where their backend signer lives, and how redemptions are triggered.

6. Open delegation is risky and not product-defined.
   - Keep it out of the MVP unless a concrete use case is defined.

7. Pause behavior is intentionally out of scope.
   - The MVP uses `pending_config`, `active`, and `revoked` only.

8. Real-time tree updates are not defined.
   - Decide between polling, server-sent events, websockets, or manual refresh.

9. Token support is narrowed for MVP.
   - Use native Base Sepolia ETH for the demo and leave USDC as a future production target.

10. Spending/redemption records are missing from the schema.
    - The README describes delegation setup, but not how actual spend history is stored and audited.

11. Chain and deployment environments need to be explicit.
    - The code uses Base Sepolia. The README should state whether this is the MVP chain and what changes for production.

12. User email is intentionally removed.
    - Wallet identity and invite-link association are enough for the MVP.

13. Company ownership model may be too narrow.
    - The README says one employer account per company. If multiple admins are needed later, this should become a company membership model.

## Suggested MVP Scope

For the first usable milestone, keep the scope narrow:

1. Employer signup and company creation.
2. Company smart account activation on Base Sepolia.
3. Manual employee invite and employee signup.
4. Employer creates one native ETH periodic delegation to an employee.
5. Employee redelegates a smaller amount to an EOA.
6. Employer can view the resulting tree.
7. Revocation marks the delegation and child delegations revoked in the database.

This MVP proves the core custody model, role model, delegation tree, caveat configuration, and redelegation constraint story without taking on the full AI agent runtime immediately.
