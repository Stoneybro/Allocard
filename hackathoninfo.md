# Monad Metropolis: hackathon information for Allocard

Research checked: 10 October 2026.

This file preserves the hackathon context alongside the focused [onboarding proposal](./proposal.md). Event dates below are organizer dates, not an implementation schedule. Confirm unresolved submission requirements in the official portal before submitting.

## Event and official links

Monad Metropolis is a global, online-first hackathon for products built on Monad. The public registration portal displays a September 1–October 13 build window and a prize pool above $250,000. Register and submit through the [official hackathon portal](https://hackathon.monad.xyz/). Use the same login provider used for registration: the portal says its Google, GitHub, and Discord logins create separate accounts.

The [official landing page](https://www.monad.xyz/developers/hackathons/metropolis) could not be retrieved during this research. The signed-out portal did not expose the submission form, full rules, judging rubric, or individual bounty terms. The sources below are supplementary public event information, not a replacement for those terms.

## Track and Allocard's positioning

The [Monad Foundation / Encode event page](https://luma.com/metropolis-lon-oct-2026) lists four tracks:

- Onchain Finance & Trading
- Consumer Products & Payments
- Social, Attention & Culture
- Trust, Identity & AI Infrastructure

Allocard targets **Consumer Products & Payments**. The event describes this track as “crypto that doesn't feel like crypto,” with examples including social payments, salary streaming, and programmable gifts. This supports a familiar payments experience; it is not evidence of a formal ban on technical disclosures.

Our product interpretation and decisions:

- Lead with controlled company spending for employees and assistants.
- Use Google or email sign-in through Privy. Remove wallet-only login.
- Get the employee's verified email from the authenticated identity.
- Let an employer add themselves and switch to their own employee view immediately.
- Remove invitation links and extra-browser-profile instructions.
- Keep wallets, chain selection, and gas management out of routine onboarding.
- Show clear budgets, payment consent, actual status, and useful errors.
- Explain funding and settlement limitations honestly where they affect a decision.

Monad is the intended execution network for the submission. Authentication improvements alone do not establish that Allocard runs on Monad. Verify the deployed accounts, delegation contracts, transaction execution, and infrastructure on the chosen Monad network before claiming integration. Testnet versus mainnet submission requirements remain unverified.

## Published dates

The [Rise In event listing](https://www.risein.com/monad/monad-metropolis-hackathon) gives this schedule in its detailed Timeline section:

| Milestone | Published date, 2026 |
| --- | --- |
| Registration and build window start | September 1 |
| Submission deadline | October 13 |
| Judging | October 14–27 |
| Winners announced | November 3 |

The listing's summary fields instead show August 31, an October 12 deadline, and a November 2 end date. The official portal and Encode event agree on the September 1–October 13 window. Exact submission time and timezone were not verified from a primary source; do not assume midnight Lagos time. Check the portal's actual cutoff.

## Prizes and participation

The [Foundation / Encode event page](https://luma.com/metropolis-lon-oct-2026) advertises $250,000+ overall, $30,000 per track, a $25,000 grand champion prize, and more than 20 sponsor bounties. These are advertised pools, not guaranteed awards or confirmed allocations to an individual winner.

[Rise In](https://www.risein.com/monad/monad-metropolis-hackathon) describes participation as open to solo builders and teams, without prior onchain experience or fundraising required. It also mentions ecosystem support and residency invitations for top teams. Exact team-size, geographic, age, and payout restrictions were not available in the retrieved public material.

## Sponsors relevant to our decisions

The [Foundation / Encode event page](https://luma.com/metropolis-lon-oct-2026) names Dynamic, Privy, Perpl, Nansen, Chainlink, Agora, Kuru, and MetaMask among bounty partners. It also lists Aurora and Envio sessions. [Rise In](https://www.risein.com/monad/monad-metropolis-hackathon) additionally names Alibaba Cloud and Kimi among bounty partners.

For Allocard, Privy is the selected identity and embedded-wallet provider; MetaMask remains the existing account/delegation layer. Dynamic is not an additional dependency. Sponsor-specific award amounts, required integrations, and eligibility have not been verified from primary bounty terms. Using a sponsor SDK does not by itself establish bounty eligibility. Do not expand the scope to add sponsor logos.

## Submission preparation and unresolved rules

The following is our preparation checklist, not a verified organizer-mandated format:

- A working application URL and concise instructions for the real employer-to-employee journey.
- Repository and setup instructions that reflect the implemented version.
- A short product explanation and a recording showing what actually works.
- Evidence of Monad execution: deployed addresses, network, and confirmed example transactions.
- A clear account of which sponsor integrations are used and what each does.
- Disclosure of existing Allocard work versus changes made for Metropolis, supported by commits.
- Accurate limitations for payments, merchant fulfilment, test assets, and incomplete features.

Allocard was built for an earlier hackathon. Before submitting, verify the rules for pre-existing projects, earlier submissions or prizes, and substantial new work during the build window. Do not assume eligibility or describe the entire codebase as newly built. The public pages retrieved here do not settle those questions.

Still to verify in the official portal or with organizers:

- Exact deadline time and timezone.
- Existing-project eligibility and required prior-work disclosure.
- Required submission fields, video length, repository visibility, and licensing.
- Judging criteria and their weights.
- Required Monad network and deployment evidence.
- Team restrictions, track-entry rules, and sponsor-bounty combinations.
- Privy and MetaMask bounty requirements, including whether our actual integrations qualify.

The [official portal](https://hackathon.monad.xyz/) is the next source for these details. No submission or registration was performed as part of this documentation update.
