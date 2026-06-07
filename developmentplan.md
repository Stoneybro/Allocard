# Allocard Development Plan

## Current Understanding

Allocard is intended to be a trustless corporate expense card system built around MetaMask Smart Accounts. Companies keep custody of funds in a company smart account and grant constrained spending authority to employees, AI agents, or external wallet addresses through signed delegations and on-chain caveats. Employees can redelegate a subset of their authority to AI agents or EOAs, while the caveat rules prevent spending outside the approved policy.

The intended product has two primary modules:

- Employer module: company onboarding, master card activation, employee invites, agent management, delegation tree management, caveat configuration, activation, revocation, and full-tree visibility.
- Employee module: employee onboarding through invites, viewing received authority, redelegating to agents or EOAs, and managing only delegations created from the employee's authority.

The current codebase is an early Next.js dashboard scaffold. It has useful pieces in place, but most of the product behavior described in the README is not implemented yet.

## Current Codebase State

Implemented or partially implemented:

- Next.js app under `apps/web`.
- shadcn-based dashboard shell with sidebar, header, summary cards, and React Flow canvas.
- Placeholder dashboard data and placeholder canvas nodes.
- MetaMask Embedded Wallet / Web3Auth provider configuration.
- Wagmi and React Query provider setup exists in `components/Web3Providers.tsx`, but it is not currently mounted in `app/layout.tsx`.
- Smart account helper code using `@metamask/smart-accounts-kit`, Viem, Base Sepolia, bundler, and paymaster configuration.
- `WalletDashboard.tsx` can connect a wallet and attempt smart account deployment, but it is not wired into the active dashboard page.

Not implemented yet:

- Persistent database layer.
- User, company, invite, agent, delegation, or caveat models.
- Employer and employee route separation.
- Onboarding flows.
- Role-aware auth/session handling.
- Invite link validation and acceptance.
- Real sidebar recipient lists.
- Drag-and-drop recipient creation on the canvas.
- Canvas persistence.
- Delegation configuration drawer.
- Delegation creation, signing, storage, redemption, pause, or revoke flows.
- Caveat generation and validation.
- Redelegation rules and parent/child delegation constraints.
- AI agent runtime or backend signer management.
- Real dashboard metrics.
- Tests.
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

Steps:

1. Define the authenticated user lifecycle.
   - Map MetaMask Embedded Wallet identity to `users.embedded_wallet_address`.
   - Decide whether email is required at signup or optional depending on Web3Auth provider data.
   - Create server-side helpers for loading the current user.

2. Build employer signup.
   - Collect company name.
   - Create `users` row with `role='employer'`.
   - Create `companies` row with owner relationship and invite code.
   - Start with `companies.smart_account_address = null`.

3. Build company card activation.
   - Reuse the existing smart account deployment logic.
   - Store the deployed smart account address in `companies.smart_account_address`.
   - Show concealed card state before activation and revealed address after activation.

4. Build invite creation.
   - Employer can create invite links.
   - Insert `invites` rows with `pending` status.
   - Support optional invite email if the product requires it.

5. Build employee signup through invite.
   - Validate invite code.
   - Create `users` row with `role='employee'` and `company_id`.
   - Deploy or activate the employee smart account at the agreed point in the flow.
   - Mark invite as accepted.

Acceptance checkpoint:

- Employers and employees can be created through the intended flows.
- Company and employee smart account addresses can be persisted.
- The app knows which dashboard a connected user should see.

## Phase 3: Employer Dashboard MVP

Goal: replace the placeholder dashboard with a real employer workspace.

Steps:

1. Rework dashboard routing.
   - Add employer routes, likely under `/dashboard` or `/employer`.
   - Add employee routes separately, likely under `/employee`.
   - Redirect users based on `role`.

2. Replace placeholder sidebar content.
   - Show company name instead of `Acme Inc.`
   - Show employees from the database.
   - Show company AI agents from the database.
   - Add clear affordances for creating invites, adding EOAs, and creating agents.

3. Replace placeholder summary cards.
   - Employees count.
   - Active delegations count.
   - Active agents count.
   - Total delegated amount, scoped by selected token or clearly marked if multi-token.

4. Build employer React Flow node types.
   - Master card node.
   - Employee node.
   - Agent node.
   - EOA node.
   - Pending configuration state.
   - Active, paused, and revoked visual states.

5. Persist canvas positions.
   - Store x/y values on the `delegations` row as described in the README.
   - Load nodes and edges from the database rather than constants.

Acceptance checkpoint:

- Employer dashboard reflects real company state.
- Employer can see company card, employees, agents, and stored delegation relationships on the canvas.

## Phase 4: Delegation Configuration and Activation

Goal: make employer-created delegations real.

Steps:

1. Build recipient placement.
   - Drag or click employee/agent/sidebar entries onto the canvas.
   - Create a `delegations` row with `pending_config` status.
   - Support direct EOA entry with address validation and optional label.

2. Build caveat configuration drawer.
   - Token type.
   - Token address or native token selector.
   - Maximum amount.
   - Period for recurring allowances.
   - Optional allowed targets.
   - Optional limited call count.
   - Optional per-transaction cap.

3. Implement caveat persistence.
   - Store caveats in `delegation_caveats.caveat_value`.
   - Normalize amounts using token decimals.
   - Validate required caveat fields before activation.

4. Generate MetaMask Smart Accounts Kit delegation objects.
   - Convert stored caveats into Smart Accounts Kit caveat enforcer config.
   - Sign delegations from the company smart account.
   - Store `delegation_hash` and mark delegation `active`.

5. Add revocation and pause semantics.
   - Implement revoke first because the README has clear chain invalidation rules.
   - Defer pause until the product semantics are finalized.
   - When a parent is revoked, update affected child delegation statuses.

Acceptance checkpoint:

- Employer can create a configured delegation to an employee, agent, or EOA.
- The delegation is signed, stored, and reflected as active in the UI.
- Invalid or incomplete caveat configurations cannot be activated.

## Phase 5: Employee Redelegation

Goal: allow employees to redelegate only within the authority granted by the company.

Steps:

1. Build employee dashboard.
   - Show employee smart account as the root node.
   - Show the active delegation received from the company.
   - Show employee-created child delegations.

2. Enforce redelegation target rules.
   - Allow redelegation to company agents.
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

Goal: implement the agent story beyond static sidebar entries.

Steps:

1. Define agent ownership and lifecycle.
   - Employer can create company agents.
   - Platform deploys or derives an agent smart account.
   - Store agent smart account address and backend signer address.

2. Define backend signer key management.
   - Decide where signer keys live.
   - Ensure private keys are never exposed to the browser.
   - Add rotation and environment separation guidance.

3. Build delegation redemption service.
   - Agent process selects an active delegation.
   - Builds transaction intent.
   - Redeems through Delegation Manager.
   - Records redemption result in the database.

4. Add agent controls.
   - Agent enable/disable.
   - Spending logs.
   - Failure states.
   - Clear indication of which caveats constrain each agent.

Acceptance checkpoint:

- An agent can redeem a valid delegation using a backend-controlled signer.
- Employers can audit what the agent did and under which delegation.

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

7. Pause behavior is not defined.
   - Decide whether pause is manual, automatic, on-chain, database-only, or just a UI status.

8. Real-time tree updates are not defined.
   - Decide between polling, server-sent events, websockets, or manual refresh.

9. Token support needs narrowing for MVP.
   - Choose native token only, USDC only, or a small allowlist.

10. Spending/redemption records are missing from the schema.
    - The README describes delegation setup, but not how actual spend history is stored and audited.

11. Chain and deployment environments need to be explicit.
    - The code uses Base Sepolia. The README should state whether this is the MVP chain and what changes for production.

12. User email requirement needs clarification.
    - The schema requires unique email, but Web3 wallet auth may not always provide one.

13. Company ownership model may be too narrow.
    - The README says one employer account per company. If multiple admins are needed later, this should become a company membership model.

## Suggested MVP Scope

For the first usable milestone, keep the scope narrow:

1. Employer signup and company creation.
2. Company smart account activation on Base Sepolia.
3. Manual employee invite and employee signup.
4. Employer creates one USDC or native-token periodic delegation to an employee.
5. Employee redelegates a smaller amount to an EOA.
6. Employer can view the resulting tree.
7. Revocation marks the delegation and child delegations revoked in the database.

This MVP proves the core custody model, role model, delegation tree, caveat configuration, and redelegation constraint story without taking on the full AI agent runtime immediately.
