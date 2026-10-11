# Allocard: authentication and onboarding proposal

Updated: 10 October 2026

Status: agreed implementation direction. This document does not mean the application changes have been implemented.

## 1. Decision and scope

Make Allocard easy to enter and use from one browser session. The immediate scope is authentication, employee onboarding, company selection, and employer/employee switching. Use real accounts and real company memberships for the complete experience.

- Use Privy as the single authentication and embedded-wallet provider, with Google and email login only.
- Retain MetaMask Smart Accounts Kit and the existing delegation model, with an explicit signer integration.
- Remove invite-link functionality and invitation-token requirements.
- Let an employer add themselves as an employee and switch roles immediately.
- Let one person belong to multiple companies without creating separate login accounts.
- Keep existing spending and assistant features working through the authentication change.

The product remains:

> Allocard lets companies give employees and assistants controlled access to company money, with clear budgets, approvals, and a shared record of every expense.

This replaces the previous broad implementation proposal. There is no separate judge demo, sample-person impersonation mode, or multi-day delivery schedule. The review journey uses the same onboarding as any real user.

Allocard is being prepared for **Monad Metropolis**, targeting **Consumer Products & Payments**. Familiar onboarding is part of that product direction. Event facts, source links, submission considerations, and unresolved requirements live in [hackathoninfo.md](./hackathoninfo.md). Monad remains the intended submission network; narrowing this onboarding proposal does not remove that objective.

## 2. Authentication: Privy

Offer only Continue with Google and Continue with email. Email uses a verification code. Remove wallet-only login, Connect wallet entry points, and external-wallet authentication fallbacks from the normal sign-in flow. A browser extension must not be required.

Read the verified email from the authenticated Privy identity on the server. Google users do not re-enter it during onboarding; email-login users enter it once during authentication. Do not add a separate employee-email form after login. Use this verified identity for membership discovery and self-add.

Embedded wallets remain underlying signing infrastructure. Users should work with companies, allowances, expenses, and payments without choosing a chain, obtaining gas, or interpreting raw signature requests. Present understandable consent and payment status; keep technical details optional.

Privy supports email/social authentication, embedded wallets, and linking authentication methods to the same user. Use those capabilities to reduce setup. Its popularity with other projects is not a reason to add a second provider. Dynamic is outside this implementation scope.

References: [Privy authentication](https://docs.privy.io/authentication), [Privy access tokens](https://docs.privy.io/authentication/user-authentication/access-tokens).

Privy establishes identity. Allocard owns company memberships and role permissions. Verify provider tokens on the server and map the verified provider user ID to a stable Allocard user ID. Never create an authenticated session from a client-supplied address, email, or user ID alone.

Handle linked login methods deliberately so a returning person can reach their existing account. Do not merge accounts or grant company access based on an unverified email supplied by the browser.

The embedded wallet supplies a signer for the existing MetaMask account/delegation layer. Verify compatibility before replacing the current provider. Authentication migration must preserve access to existing smart accounts and permissions; a new embedded signer does not automatically control an old account. Existing users need an explicit, verified account-linking or ownership-transfer path where required.

## 3. Employer onboarding and immediate self-add

The main journey is:

1. Sign in once.
2. Create a company by entering its name.
3. Open the employer dashboard with a clear Add employee action and an Add myself as an employee shortcut.
4. Add yourself with the shortcut, or enter your own verified email in the standard employee form.
5. Immediately enable the Employer / Employee switch for that company.
6. Assign spending access as the employer, switch to Employee, and use your own employee dashboard.

The self-add shortcut resolves the authenticated user automatically. It does not require copying an ID, verifying the same email again, accepting a link, logging out, or opening another browser profile. If an existing Allocard user ID is supported in Add employee, resolve it server-side; entering an ID identifies the recipient and does not authenticate them.

Self-add is idempotent: repeating it returns the existing employee membership rather than creating duplicates. The authenticated employer's explicit self-add action is sufficient acceptance of their own membership.

Employee membership and wallet/account readiness are separate states. Enable role switching immediately after membership creation. Provision signing infrastructure when needed with clear progress and retry states; do not block dashboard access on a chain deployment. Spending remains unavailable until the required account and delegation are ready.

## 4. Add employees without invite links

An employer adds an employee by email. Store a company-scoped pending employee record whether or not that person has signed up yet. Show the employee in the employer's team list with an accurate pending or active status.

When the employee signs in and verifies the matching email, Allocard discovers their pending company memberships. Show the company name and an in-app Accept action. Acceptance activates that membership and opens the employee dashboard. A person already signed in can discover a newly added membership without logging out.

There is no invitation URL to generate, copy, send, redeem, or expire. Remove invite-link controls, token-generation and redemption code, and onboarding dependencies on invitation query parameters. Old invitation URLs should lead to normal sign-in with a brief explanation; an old token must no longer grant membership.

Pending membership is an employee record awaiting the person's acceptance, not a link-based invitation system. Keep that distinction clear in UI labels.

Only a verified email associated with the authenticated identity can claim a pending email record. Normalize email consistently without speculative transformations such as removing dots or plus suffixes. Do not grant access based on email domain alone.

Adding an email must not reveal whether it belongs to other companies. Removing and re-adding an employee must not silently restore revoked spending permissions.

## 5. One account, multiple companies

A person has one Allocard account and can have memberships in several companies. The same email in two companies is valid. Employee records, roles, allowances, expenses, and permissions remain scoped to their respective companies.

Example: Alice is an employer and employee at Acme, and an employee at Beta. She signs in once. In Acme she can switch between Employer and Employee; in Beta she has Employee access only.

| Situation | Required behavior |
| --- | --- |
| One active company membership | Open that company directly |
| Several active companies, first visit | Show a company picker |
| Returning user | Restore the last-used company and role if still authorized |
| Change company | Use a persistent company selector without signing out |
| Both roles in the selected company | Show Employer / Employee switching |
| Only one role in the selected company | Open the permitted view; do not offer inaccessible roles |
| Pending memberships | Show companies awaiting acceptance within the app |
| No memberships | Offer company creation and explain that employee access appears after an employer adds the verified email |
| Duplicate employee in the same company | Return Already an employee; do not create a second record |
| Removed from one company | Remove access there while retaining other company memberships |
| Saved company or role no longer available | Select a valid context or show the picker; avoid redirect loops |

Keep company selection and role selection separate. Changing companies must resolve a valid role for the new company, not carry employer access across companies.

## 6. Role switching and authorization

Role switching changes the active workspace view; it does not replace the signed-in person or create a second session. Employer and employee pages use the same authenticated identity.

Store employer and employee capabilities on the user's company membership. Do not use one global employer-or-employee field. A person can hold both capabilities within a company.

An employer switching to Employee sees their own employee record. They cannot become another employee or use that employee's signer. Company treasury accounts and employee accounts retain their separate purposes even when controlled through the same person's authenticated session.

Every server read and mutation checks the authenticated user, company membership, required permission, and resource ownership. A selected role, URL parameter, local-storage value, or client-supplied company ID never grants access on its own. Employee endpoints retain employee-scoped behavior even when the person also has employer permissions.

On context changes, clear or partition cached company data, reset forms tied to the previous workspace, and prevent late responses from displaying another company's information. Recheck context and authorization before submitting spending actions. Refreshes, direct links, browser navigation, and multiple tabs must resolve an authorized workspace consistently.

## 7. Data and migration requirements

Use the existing Next.js, TypeScript, Postgres/Drizzle, and UI stack. Evolve the schema rather than replacing the application.

Core relationships:

- User: stable Allocard identity, linked verified provider identity, and verified login methods.
- Company membership: user, company, status, and employer/employee capabilities; unique per company and user.
- Pending employee: company and normalized email awaiting verification and acceptance; prevent duplicate pending records in the same company.
- Employee profile: company-scoped employee details attached to the membership.
- Signer/account linkage: explicit ownership and purpose for company and employee accounts.
- Workspace preference: last-used company and role, treated only as a preference and checked against current access.

Claiming a pending employee and self-adding must be transactional and safe to retry. Preserve existing company records, employees, account addresses, delegation ancestry, and activity. Do not infer wallet ownership from an email match or discard funded accounts when switching providers.

Backfill existing memberships using verified relationships. Flag ambiguous legacy records for resolution rather than assigning them to the first matching company. Retire invitation tokens without deleting established memberships. Update onboarding copy and the README walkthrough when the application changes land so they no longer instruct users to use invitations or another Chrome profile.

## 8. Work included and deferred

Included work is Privy integration, verified server sessions, membership migration, email-based employee discovery and acceptance, self-add, company and role switching, consistent routing, and the authorization checks needed to make those flows correct.

Preserve existing spending and assistant workflows. Check that the new signer can perform the account and delegation operations those workflows require. Do not claim migration success based on login alone.

The previous proposal also called for a Monad execution migration, stablecoin settlement, new indexing infrastructure, a replacement AI provider, a shared payment-service rewrite, new vendor integrations, and a broad dashboard redesign. Those are deferred from this onboarding change. Monad remains broader project context; this document neither implements nor validates that network migration. Additional sponsor integrations and bounty research must not expand the authentication scope.

Previously recorded concerns about delegation revocation, payment verification, duplicate execution, AI failure handling, and account ownership remain unresolved unless separately verified and fixed. Narrowing this proposal is not evidence that existing payment paths are production-ready. Address any such issue that blocks safe operation of the revised journey rather than hiding it behind improved onboarding.

## 9. Acceptance criteria

- A fresh user sees only Google and email login; wallet-only authentication and Connect wallet entry points are absent.
- The employee email comes from the verified Privy identity, with no duplicate onboarding email entry.
- An employer creates a company, adds themselves, and switches to their own employee dashboard in the same browser session.
- Self-add works through the shortcut and through the employer's verified email, without duplicates or a second login.
- An employee signs in normally, discovers a pending company membership, accepts it inside the app, and enters the correct dashboard without an invite link.
- One email can belong to two companies; the picker, switching, and returning-user behavior all work.
- Employer access in one company does not grant employer access in another.
- Duplicate adds, repeated acceptance, and concurrent requests do not create duplicate memberships.
- Revoked membership blocks server access even if an old dashboard tab remains open.
- Refreshes, direct dashboard links, expired sessions, rejected login, and logout recover without loops or stale company data.
- Existing users retain verified access to their original accounts, and the Privy signer supports the required MetaMask account and delegation operations.
- The employer can issue spending access, switch to Employee, complete a supported action under that access, and return to Employer to see its actual result.
- Relevant type, lint, build, authorization, migration, and end-to-end checks pass for the implementation.

Success is a working employer-to-employee journey using one real account in one browser session, with clear company boundaries and no invite-link dependency.
