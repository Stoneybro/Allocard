# Monad Metropolis sponsor and prize evaluation guide

**Research date: 11 October 2026**  
**Prepared for: Allocard**  
**Purpose: compare sponsor opportunities personally before choosing integrations.**

## 1. Scope and how to interpret the evidence

This guide covers 24 named sponsors or supporters found in public Metropolis material. Detailed profiles cover the identified monetary bounties and significant credits; sponsors with undisclosed amounts remain included so an unknown prize is not mistaken for a small prize.

For this guide, “substantial” means at least **$1,000 in advertised bounty value or service credits**. That is an editorial threshold, not an organizer category. Free plans are included separately because they may help finish Allocard even without winning.

**This is a public-source research guide, not a complete copy of the official bounty rulebook.** The signed-out [official portal](https://hackathon.monad.xyz/) displays the event but does not expose all terms. The official landing page and some individual track pages could not be retrieved. Public announcements sometimes provide an amount without its winner split, payout asset, or eligibility conditions.

Evidence labels used throughout:

- **Primary:** amount or participation stated on an organizer/sponsor-controlled page that was readable.
- **Reported:** amount or condition found in a third-party report or a mirror of an organizer/sponsor social post. Useful evidence, but not independently verified against the full official terms.
- **Undisclosed:** participation was found, but a usable prize amount or complete condition was not.
- **Analysis:** my interpretation of product fit, integration effort, or a possible Allocard feature. These are not organizer requirements.

A dollar amount may be a shared pool. “USD bounty” does not establish payment by bank transfer; payout could be in stablecoins or another form. Credits are restricted spending power, not cash, and plan values are not necessarily savings you would otherwise incur. No combined “possible winnings” total is calculated because overlapping eligibility and award stacking remain unverified.

## 2. Event context

The [official portal](https://hackathon.monad.xyz/) displays September 1–October 13 and a $250,000+ prize pool. The [London organizer event page](https://luma.com/metropolis-lon-oct-2026) lists four tracks:

1. Onchain Finance & Trading
2. Consumer Products & Payments
3. Social, Attention & Culture
4. Trust, Identity & AI Infrastructure

The London event page advertises $30,000 per track and $25,000 for the grand champion. An [Encode launch post](https://www.linkedin.com/posts/encode-club_monad-metropolis-is-live-and-were-hosting-activity-7501957376561000448-XLXq) instead says $30,000 overall and describes three $10,000 winners per track. **There is a public-source discrepancy in the grand-prize figure; confirm the current portal allocation.**

A [mirror of Monad Devs' submission announcement](https://free-wifi-password-recovery.twstalker.com/monad_dev) reports an October 13, 11:59 PM ET cutoff. If ET means US Eastern daylight time on that date, the conversion is **October 14 at 4:59 AM in Lagos**. This conversion is conditional on that reported cutoff; check the portal and aim to submit earlier.

Allocard's natural track is Consumer Products & Payments. Its permissioned AI spending can support the narrative, but sponsor selection should not obscure the core product: a company assigns budgets, employees or assistants spend within authority, and finance can inspect and revoke access.

## 3. Cash or monetary bounty comparison

Amounts below are advertised or reported opportunity values, not verified payouts per team. Each source is identified in the detailed profile.

| Sponsor | Advertised/reported value | Award interpretation | Evidence | Allocard fit / effort: analysis |
| --- | --- | --- | --- | --- |
| Agora | $10,000 USD | Reported bounty; split and payout method unknown | Reported | High product fit; high effort if mobile, Mera and remittance requirements all apply |
| Perpl | $5,000 API + $3,000 analytics/risk | Two distinct awards; do not assume one team can collect both | Reported sponsor post | Low fit for core expenses; high effort for trading |
| Privy | $5,000 | Monetary bounty; payout form and split unverified | Reported | Very high fit; lower incremental effort because already integrated |
| Dynamic | $5,000 | Monetary bounty; payout form and split unverified | Reported | Useful alternative to Privy; high migration cost now |
| Nansen | $5,000 | Best project using its data; complete rubric unavailable | Reported | Medium fit for counterparty intelligence |
| Kuru | $5,000 USD | Spot-trading bounty | Reported | Medium for treasury conversion, low for core expenses |
| Aurora Intents | $5,000 | Cross-chain funding/integration bounty | Reported; sponsor-representative context also available | High fit for treasury deposits; medium–high effort |
| Category Labs / Mera | $5,000 total | Explicitly multiple bounties totaling this amount; split unknown | Primary | Good onboarding technology; overlaps current Privy choice |
| MetaMask | $2,500 USD | Agent Wallet plugin challenge, reportedly trading-focused | Reported | Existing account layer fits; current app does not establish plugin eligibility |
| Envio | $1,000 | Best Use of Envio, plus separate hosting benefit | Primary | Very high fit for payment audit trail; medium effort |
| Chainlink | Not established | Sponsor confirmed; monetary terms unavailable | Primary participation only | Potentially useful for externally verified workflows |
| Alibaba Cloud / Qwen | Not established | Sponsor confirmed; cash/credit split unavailable | Primary participation only | Good AI fit, subject to specific model and workflow requirements |
| Cleanverse | Not established | Bounty confirmed; value unavailable | Primary participation only | Potential identity/asset verification fit |

**Payout details not established for the table:** number of winners except where explicitly described, whether values are pooled, cash versus stablecoin settlement, regional payout restrictions, and whether the same submission can win multiple sponsor awards.

## 4. Detailed monetary bounty profiles

### 4.1 Agora — AUSD payments

**Award evidence:** $10,000 USD is reported in a [reproduction of a Monad Devs announcement](https://cryptitalk.com/2026-09-23-17-40/crypto/GEOD). The reported brief combines a mobile app, cross-border AUSD transfers, Mera passkey onboarding and rapid settlement. Full rules and award division were not retrieved.

**What it provides:** Agora issues AUSD and offers stablecoin infrastructure. Its [official developer documentation](https://docs.agora.finance/developer) is the starting point for token details; the [company site](https://www.agora.finance/) describes the stablecoin and APIs. Do not substitute another stablecoin or a locally deployed mock and assume eligibility.

**Allocard concept — analysis:** dollar-denominated corporate allowances and reimbursements for distributed teams. Example: allocate a $200 travel budget, approve a $35 claim, settle in AUSD and show the remaining allowance.

**Work involved:** token balances and decimals, ERC-20 execution, token-specific spending limits, funding and transaction reconciliation. A native MON transfer limit does not automatically constrain ERC-20 transfers. If mobile/Mera/remittance elements are mandatory, the project scope expands considerably.

**Demo evidence to prepare:** actual AUSD settlement on the required Monad network; token/address identification; amount and recipient verification; a clear employee or contractor payment journey.

**Questions before choosing:** Is a responsive web app/PWA acceptable? Is Mera mandatory? Do business reimbursements qualify as cross-border payments? Is testnet supported? Must the demo include conversion into local money?

**Assessment:** excellent product direction, but do not treat generic AUSD support as proof of bounty qualification.

### 4.2 Perpl — exchange integration and analytics

**Award evidence:** the sponsor's post, available through a [social mirror](https://www.sotwe.com/perpltrade), describes two awards: **$5,000 for Best Use of Perpl's API** and **$3,000 for Best Analytics / Risk Tool**. Award stacking and splits are unknown.

**What it provides:** Perpl is a perpetual futures exchange built for Monad. Read the [official introduction](https://docs.perpl.xyz/) before judging whether derivatives belong in your product.

**Possible projects — analysis:** a trading interface, a position-monitoring dashboard, or an agent exposure-control tool. For Allocard, a separate treasury monitoring module would be more coherent than putting leveraged trading inside employee expense flows.

**Work involved:** understanding positions, margin, liquidation, funding and trade state; handling market data; proving the displayed analytics correspond to actual positions. An analytics-only submission might avoid transaction execution, depending on the rules.

**Demo evidence to prepare:** authentic Perpl data or execution, meaningful calculations, and a clear explanation of what the user can decide or do.

**Questions before choosing:** Can a read-only tool qualify for the analytics award? Which networks and endpoints count? Is API use mandatory for both awards? Are the two bounties mutually exclusive?

**Assessment:** meaningful headline value, weak fit for Allocard's current purpose. Consider only if you independently want a treasury trading/risk product.

### 4.3 Privy — embedded wallets beyond sign-in

**Award evidence:** **$5,000**, with an integration extending beyond authentication, is reported by [Monad Intelligence](https://news.susanolabs.com/monad/en/opportunities) and mirrored organizer posts. The full scoring rubric is unavailable.

**What it provides:** authentication and embedded wallets that let users access an application with familiar login methods. See [Privy authentication](https://docs.privy.io/authentication) and [wallet creation](https://docs.privy.io/wallets/connectors/usage/connect-or-create).

**Allocard concept — analysis:** employees sign in with Google/email, receive their embedded wallet, and use it to authorize a real delegated payment. Privy supplies identity and signing; MetaMask supplies the smart-account/delegation layer.

**Current position:** Allocard already includes Privy's React, Node and Wagmi packages, and its provider configures Google/email login with embedded wallet creation. This is source evidence, not confirmation that the deployed app works.

**Work involved:** complete signer/account compatibility, verified server identity, company membership boundaries and payment execution. Preserve ownership of existing smart accounts when changing signers.

**Demo evidence to prepare:** a new user progresses from sign-in to a confirmed Monad action; explain Privy's role in that action. A login screen alone is a weak demonstration of the reported brief.

**Questions before choosing:** Which wallet operations satisfy “beyond authentication”? Is client-side embedded signing sufficient? What new work must an existing project demonstrate?

**Assessment:** strongest near-term candidate because it reinforces work already present.

### 4.4 Dynamic — alternative wallet and authentication infrastructure

**Award evidence:** a **$5,000** bounty and a deployed, demonstrable integration involving authentication, wallets and signing are reported in [mirrored Monad Devs posts](https://free-wifi-password-recovery.twstalker.com/monad_dev). Exact judging terms remain unavailable.

**What it provides:** a wallet stack with SDKs/APIs covering authentication, embedded wallets and agent-related capabilities. See the [official documentation](https://www.dynamic.xyz/docs/get-started/welcome).

**Allocard concept — analysis:** the same smooth employer/employee onboarding and transaction authorization sought with Privy. Dynamic is an alternative architecture choice, not a necessary second login provider.

**Work involved:** replacing or separately integrating identity, wallet creation and signing; preserving account ownership and memberships; updating server verification and session handling.

**Demo evidence to prepare:** actual SDK-backed wallet operations in a deployed app with a complete user journey.

**Questions before choosing:** Which Dynamic products are required? Can an agent-only integration qualify alongside another user authentication provider? Is there a required minimum scope?

**Assessment:** worth evaluating on its merits for a new build. For this submission, a migration would need a strong product reason beyond an equally sized bounty.

### 4.5 Nansen — wallet and counterparty intelligence

**Award evidence:** a **$5,000** prize for a project using Nansen API, MCP or CLI data is reported by [Bit.Fan](https://www.bit.fan/en/news/list/nansen-monad-global-hackathon-metropolis-d9ad1699-en-keyName-c4b361fc). Primary full bounty terms were not retrieved.

**What it provides:** wallet balances, transactions, labels, counterparties and other blockchain analytics. The [official API overview](https://docs.nansen.ai/api/overview) describes the available categories. Some [wallet endpoints explicitly list Monad](https://docs.nansen.ai/api/profiler/address-related-wallets).

**Allocard concept — analysis:** enrich merchant addresses or provide a finance review panel showing known labels and payment relationships. Keep this advisory; a wallet label or relationship does not prove a merchant's legitimacy or fraud.

**Work involved:** API access, request handling, caching, distinguishing missing data from a clean result, and checking actual coverage for the chosen network. Mainnet coverage does not imply testnet coverage.

**Demo evidence to prepare:** data that changes a useful user decision, with provenance and graceful handling of unknown addresses.

**Questions before choosing:** Are API credits supplied to entrants? Which endpoints qualify? Does using MCP in the development process count, or must data power the finished app? What are usage costs after the event?

**Assessment:** a plausible differentiated finance feature, but less essential than transaction reconciliation. Check [credit pricing](https://docs.nansen.ai/getting-started/credits), especially label lookups, before designing frequent queries.

### 4.6 Kuru — spot trading on Monad

**Award evidence:** **$5,000 USD**, reportedly for a focused spot-trading product executing through Kuru's onchain order book. Source: [mirrored organizer announcement](https://d46rckpsl2ks7laj5lfg.twstalker.com/monad_dev).

**What it provides:** an onchain order-book DEX, aggregator, API and SDK. The [official Kuru overview](https://docs.kuru.io/) distinguishes its exchange and aggregation products.

**Allocard concept — analysis:** a narrowly scoped treasury conversion feature: turn a supported deposit asset into the settlement asset used for employee budgets. A dedicated trading assistant would be a much larger departure.

**Work involved:** token approvals, quote expiry, slippage bounds, supported markets, trade settlement and preserving budget constraints around swaps.

**Demo evidence to prepare:** actual trades using the required Kuru execution path and a useful interface.

**Questions before choosing:** Does aggregator use count, or must orders hit the Kuru order book specifically? Is a payment-oriented conversion feature sufficiently focused? Are testnet markets available for the required pair?

**Assessment:** sensible if conversion is already part of your roadmap. It is not required simply to transfer a stablecoin.

### 4.7 Aurora Intents — fund Allocard from another chain

**Award evidence:** **$5,000** is reported in a [mirrored organizer announcement](https://d46rckpsl2ks7laj5lfg.twstalker.com/monad_dev). The linked official track is [Bring Any-Chain Liquidity to Monad](https://hackathon.monad.xyz/tracks/bring-any-chain-liquidity-to-monad), whose full content could not be retrieved.

A [public sponsor-representative post surfaced on LinkedIn](https://pt.linkedin.com/in/charliebussat) describes Swap API, Intents Deposits or Intents Connect integrations and emphasizes working cross-chain UX. It also mentions engineering office hours and distribution support; the exact benefits need confirmation.

**What it provides:** cross-chain funding and swap integration options. The official [Intents Swap Widget repository](https://github.com/aurora-is-near/intents-swap-widget) provides swap/deposit/withdraw components.

**Allocard concept — analysis:** an employer funds the company treasury using an asset on another supported chain; Allocard receives the intended asset on Monad and updates the available budget.

**Work involved:** quotes, source-chain funding, destination settlement, status updates, refunds/failures and preventing duplicate crediting. A source-chain deposit is not yet confirmed spendable treasury money on Monad.

**Demo evidence to prepare:** follow one real funding transfer through to destination receipt, then show the funded balance used in Allocard.

**Questions before choosing:** Which asset/network routes work for the demo? Is testnet available? Does a deposit widget qualify by itself? Is deposit-and-execute required or optional? How are stalled transfers resolved?

**Assessment:** stronger fit than initially apparent. This solves a real treasury onboarding problem and deserves comparison with Envio as an additional integration.

### 4.8 Category Labs / Mera — passkey-derived accounts

**Award evidence:** Category Labs directly announces [Metropolis bounties totaling $5,000](https://www.linkedin.com/posts/category-labs_weve-hosted-two-internal-hackathons-so-far-activity-7503072302591311872-ZhU4). The post does not establish that one winner receives all $5,000.

**What it provides:** Mera is a TypeScript library for accounts derived from passkeys, with web and mobile support. Its [official repository](https://github.com/category-labs/mera) states that the API is in preview and that the application remains responsible for account derivation choices, recovery, storage and funding flows.

**Allocard concept — analysis:** employees access signing accounts through passkeys. It may also be relevant to Agora's reported challenge, but that does not establish that the two awards can be combined.

**Work involved:** platform/authenticator support, recovery UX, smart-account signer compatibility and migration of existing account ownership. Passkey access does not replace company membership authorization.

**Demo evidence to prepare:** sign-up, returning access and an actual transaction on supported target devices.

**Questions before choosing:** What are the separate bounty categories? Which devices must work? Can Mera coexist with Privy? What account recovery behavior is expected?

**Assessment:** useful technology, but potentially duplicates the current onboarding direction. Evaluate its recovery and deployment implications before changing foundations.

### 4.9 MetaMask — Agent Wallet plugin

**Award evidence:** a **$2,500 USD** bounty is reported for a plugin adding trading capability to MetaMask Agent Wallet. Source: [Monad Intelligence's bounty report](https://news.susanolabs.com/monad/en/opportunities). Full conditions remain unverified.

**What it provides:** the [Agent Wallet](https://docs.metamask.io/agent-wallet/) exposes agent-oriented wallet functionality and a plugin system. This is distinct from the Smart Accounts Kit already used by Allocard.

**Allocard concept — analysis:** a plugin exposing controlled treasury actions could be interesting, but an expense-payment command may not satisfy a trading-specific brief.

**Work involved:** a separate plugin package and command surface, integration with Agent Wallet's execution model, installation/documentation, and a qualifying use case.

**Demo evidence to prepare:** install and run the actual plugin through Agent Wallet, and show the required capability completing on Monad.

**Questions before choosing:** Are expense payments in scope? Is trading mandatory? Which plugin version and execution environment are expected? Can existing delegation work contribute to judging?

**Assessment:** preserve your existing MetaMask integration for the product. Do not assume it qualifies for this particular bounty.

### 4.10 Envio — onchain data and audit history

**Award evidence:** Envio directly confirms **$1,000 for Best Use of Envio** and **$5,000 of free Envio Cloud hosting for winning teams** in its [September developer update](https://docs.envio.dev/blog/developer-update-september-2026). The number of hosting recipients and whether that value is pooled are unclear.

**What it provides:** [HyperIndex](https://docs.envio.dev/docs/HyperIndex/overview) converts chain events into structured, queryable data. HyperSync and HyperRPC provide other blockchain data access paths.

**Allocard concept — analysis:** a finance activity feed derived from confirmed payments, delegation usage and revocations, linked to private expense records.

**Work involved:** selecting relevant contracts/events, initial backfill, correct chain selection, transaction/log deduplication, handling reverted or reorganized data, and protecting private company data at the application layer. Native transfers may require execution data beyond ERC-20-style transfer events.

**Demo evidence to prepare:** execute a payment and show it appearing in the indexed feed; show revocation or a failed attempt without presenting it as successful spending.

**Questions before choosing:** Which network/data products are eligible? What counts as meaningful integration? How are hosting credits allocated, activated and expired?

**Assessment:** one of the most coherent additions. The cash award is smaller, but the feature remains useful after the hackathon.

### 4.11 Chainlink — external data and verifiable workflows

**Award evidence:** sponsor participation is established by the [organizer's sponsor announcement](https://www.linkedin.com/company/monad-network). No defensible Metropolis-specific amount or complete bounty brief was found.

**What it provides:** Chainlink's [official documentation](https://docs.chain.link/) covers CRE workflows, cross-chain messaging through CCIP, and data services. Availability must be checked for each service and network; “Chainlink supports Monad” does not mean every service works on every Monad environment.

**Allocard concept — analysis:** a workflow connecting an external invoice or policy result to a controlled onchain action, or supported price data used for reporting/conversion. These are possible uses, not verified bounty requirements.

**Work involved:** choosing a service with a real need, understanding its trust model, configuring workflow inputs, and demonstrating the onchain result. AI receipt extraction alone does not become factual proof when passed through an oracle workflow.

**Questions before choosing:** What is the prize? Is CRE mandatory? Are CCIP/data integrations also eligible? Which networks are required? Is a simulated workflow enough?

**Assessment:** evaluate after obtaining the actual brief. Do not undertake a large oracle integration based on the sponsor's reputation alone.

### 4.12 Alibaba Cloud / Qwen — AI agents and model infrastructure

**Award evidence:** Alibaba Cloud is named in the [organizer sponsor announcement](https://www.linkedin.com/company/monad-network). A public participant write-up describes an agentic Qwen challenge, but it is not authoritative bounty guidance. No verified cash amount, credit allocation or model requirement was found.

**What it provides:** [Alibaba Cloud Model Studio](https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio) offers Qwen and other models, compatible APIs and multimodal capabilities. Model availability, endpoints and prices vary by region.

**Allocard concept — analysis:** a reimbursement assistant extracts receipt information, evaluates policy and prepares a bounded action; deterministic checks and delegation limits govern execution.

**Work involved:** provider abstraction, selecting a model appropriate for images or tools, structured response validation and regression evaluation. Changing a base URL is not evidence that policy decisions remain reliable.

**Demo evidence to prepare:** show the model doing a meaningful step in an end-to-end workflow and demonstrate rejection of an out-of-policy request.

**Questions before choosing:** Cash or credits? Which models qualify? Must usage be through Alibaba Cloud directly? Is deployment on Alibaba infrastructure required? What counts as an agentic workflow?

**Assessment:** strong fit for existing AI features. Qwen 3.8 Max integrates directly for autonomous policy and vision.

### 4.13 Cleanverse — identity and asset verification

**Award evidence:** Cleanverse directly identifies itself as a bounty sponsor for Trust, Identity & AI Infrastructure in its [company announcement](https://sg.linkedin.com/company/cleanverse-intl). The announcement connects the challenge to verified identity and verified asset infrastructure. No prize amount was retrieved.

**What it provides:** identity/asset verification infrastructure under the Cleanverse Compliance Protocol. Sponsor material mentions CVI and CVA; detailed integration requirements were not available in the sources retrieved.

**Allocard concept — analysis:** verified vendor or contractor onboarding, followed by permissioned payments to the approved recipient. This is different from merely verifying an employee's email.

**Work involved:** access to the actual SDK/API or contracts, identity lifecycle, mapping attestations to recipients and making revocation visible in payment eligibility.

**Demo evidence to prepare:** a verifiable status has a concrete effect on which recipient can be paid, without exposing private identity data in a public demo.

**Questions before choosing:** What is the award amount? Which protocol components are required? Is sandbox access self-service? Is business verification supported? What does the attestation actually prove?

**Assessment:** conceptually relevant to corporate payments. Integration feasibility and prize value are too uncertain to prioritize yet.

## 5. Significant credits and builder perks

These benefits should be evaluated against actual infrastructure needs. A $5,000 credit award is worth less to a project that would only use $100 before expiry.

| Sponsor | Advertised/reported benefit | Evidence and allocation limits |
| --- | --- | --- |
| Envio | $5,000 of Envio Cloud hosting for winning teams | Primary; recipient count/allocation unclear; separate from $1,000 bounty |
| Zerion | $6,000 API credits for winners across four tracks; free Builder access for entrants | Reported; $6,000 is not established as per winner |
| Crouton Digital | $5,000 dedicated Monad RPC credits | Reported; winner count and redemption terms unknown |
| Kimi / Moonshot AI | $3,000 credits for a Kimi-powered project | Reported; do not present as cash |
| Alchemy | $1,000 credits for a meaningful service/tool integration | Reported; do not present as cash |
| Blockvision | Two months Lite for teams; three months Pro for track winners; up to $8,000 total stated value | Reported; the headline value is not per team |
| QuickNode | Three months of Build-plan access for teams | Reported; standalone monetary allocation not established |
| Tenderly | Pro-tier access/free license for teams | Reported; duration and exclusions unclear |
| Tencent Cloud / Hunyuan | Partner named; exact benefit not established | Primary participation, unknown award |
| Chainstack | Supporter/workshop involvement; exact benefit not established | Reported; no quantified award found |

A [mirrored organizer post](https://www6.twstalker.com/monad_dev) advertises a $7,500 builder-perk bundle involving QuickNode, Tenderly and Zerion. Do not add that bundle again to its component benefits.

### 5.1 Kimi / Moonshot AI

**Evidence:** the [mirrored Monad Devs announcement](https://d46rckpsl2ks7laj5lfg.twstalker.com/monad_dev) reports $3,000 in credits. Full selection and redemption conditions were not retrieved.

**Product:** the [official Kimi API overview](https://www.kimi.com/en/help/kimi-api/api-overview) describes text, conversation, file-processing and search capabilities, with an API format compatible with common existing integrations. Confirm specific model image/tool support separately.

**Allocard analysis:** a possible replacement or selectable provider for policy assessment, receipt interpretation or procurement research. Start with one bounded workflow and compare output quality against the current implementation.

**Evaluate:** credit expiry; eligible billing account and model; whether direct API usage is required; privacy/retention terms; latency; structured-output reliability; what happens when credits run out.

**Recommendation:** worthwhile if the model improves the product or reduces costs you expect to incur. Credits alone are a weak reason to rework an otherwise reliable decision path.

### 5.2 Alchemy

**Evidence:** $1,000 credits and a functional Monad app meaningfully using an Alchemy service/tool are reported in [mirrored organizer posts](https://d46rckpsl2ks7laj5lfg.twstalker.com/monad_dev).

**Product:** Alchemy offers Monad RPC and other infrastructure. See the [Monad resources](https://www.alchemy.com/rpc/monad) and [API quickstart](https://www.alchemy.com/docs/reference/monad-api-quickstart). Check exact bundler/paymaster compatibility before assuming it supports your account implementation.

**Allocard analysis:** replace inconsistent default RPC usage with a managed provider, or use an eligible data/notification service where it supports a real app feature.

**Evaluate:** whether RPC-only use qualifies; mainnet/testnet availability; credits applicable to the chosen product; usage quotas and expiry; account requirements.

**Recommendation:** potentially useful with relatively little application change, but provider configuration alone should not be presented as a differentiated feature.

### 5.3 Crouton Digital

**Evidence:** a [mirror of the sponsor's Telegram announcement](https://telemetr.io/ch/channels/3419149861-croutondigital/posts) reports $5,000 toward dedicated Monad RPC, open across tracks, and estimates roughly three months at its rates. That estimate is sponsor-specific, not a guaranteed term for every workload.

**Allocard analysis:** useful if agent execution and event processing need a dedicated endpoint. Unnecessary capacity has little practical value for a small demo.

**Evaluate:** endpoint network; RPC methods, archive and WebSocket support; hosting region; request limits; winner allocation; expiry; fees after credits; whether existing infrastructure use is required to compete.

**Recommendation:** compare as an operating-cost benefit after the app's actual RPC needs are understood.

### 5.4 Zerion

**Evidence:** a [mirrored sponsor announcement](https://www6.twstalker.com/monad_dev) reports $6,000 of credits across track winners and Builder-plan access for participating teams. Organizer wording describes one free month for entrants.

**Product:** the [official Zerion API documentation](https://developers.zerion.io/introduction) covers wallet-oriented blockchain data.

**Allocard analysis:** treasury balances, transaction history and asset views, particularly if the company holds assets across chains. It can complement a custom contract indexer; it should not be assumed to reconstruct every delegation-specific state.

**Evaluate:** exact winner credit allocation; supported Monad environment; coverage of your account/transaction types; request limits; expiry; which features require paid access.

**Recommendation:** useful if wallet data is an immediate gap. Compare its convenience against the more app-specific indexing available through Envio.

### 5.5 Blockvision

**Evidence:** the [mirrored organizer announcement](https://free-wifi-password-recovery.twstalker.com/monad_dev) describes two months Lite for all teams and three months Pro for track winners, with up to $8,000 total value.

**Allocard analysis:** a candidate infrastructure/data service to evaluate against your existing RPC and explorer requirements. Exact product entitlements were not verified.

**Evaluate:** what Lite/Pro actually includes for Monad; activation deadline; limits; winner allocation; whether the account renews automatically.

**Recommendation:** potentially useful free infrastructure. The total stated value is neither cash nor an established award per team.

### 5.6 QuickNode

**Evidence:** three months of Build-plan access for participating teams, reported in the [builder-perk announcement mirror](https://www6.twstalker.com/monad_dev).

**Allocard analysis:** another candidate for consistent Monad RPC access. Confirm which current plan services and networks are included before selecting it over Alchemy or Crouton.

**Evaluate:** redemption route; plan scope; expiry; network/method support; overage policy; whether an existing customer can redeem the offer.

**Recommendation:** evaluate for immediate utility rather than as a competitive cash prize.

### 5.7 Tenderly

**Evidence:** free Pro-tier access is reported in the same [organizer perk announcement](https://www6.twstalker.com/monad_dev); duration and exact included services are not established.

**Product:** [Tenderly's official documentation](https://docs.tenderly.co/introduction) covers simulation, debugging and monitoring.

**Allocard analysis:** particularly useful for examining reverted delegated transactions, contract calls and execution failures during the Monad migration.

**Evaluate:** exact support for your Monad environment and account flow; whether the offered license includes the required simulation/debugging features; quotas and duration.

**Recommendation:** a valuable development aid even if it does not become a visible feature or qualify you for a separate prize.

### 5.8 Tencent Cloud / Hunyuan

**Evidence:** named in the [organizer's Shenzhen event listing](https://luma.com/metropolis-shenzhen-sep-2026?locale=zh). No specific cash prize, model-credit amount or qualification rule was found.

**Allocard analysis:** evaluate as another potential AI/cloud provider only after obtaining the actual offer. Do not assume all Hunyuan models support receipt images or tool execution.

**Evaluate:** exact service/model, accessible regions, credit eligibility, API access, allowed workloads and award value.

**Recommendation:** keep on the research list; there is insufficient prize detail to rank it against Kimi or Qwen.

### 5.9 Chainstack

**Evidence:** [public workshop material](https://www.sotwe.com/danimimm?lang=en) connects Chainstack to Metropolis. A [community sponsor list](https://doublecrosswebzine.twstalker.com/indonads_) also names it. No quantified Metropolis reward was verified.

**Allocard analysis:** potential RPC/infrastructure help and developer or go-to-market support. These are useful categories to investigate, not established credit entitlements.

**Evaluate:** whether a participant offer exists; exact plan and duration; whether there is a bounty or only support; relevant Monad infrastructure.

**Recommendation:** do not count an unconfirmed award in your prize comparison.

## 6. Additional names with insufficient award information

These names appear in a [community reproduction of the sponsor roster](https://doublecrosswebzine.twstalker.com/indonads_). Their identity, offer and substantial prize value could not be established from the retrieved material. They are included for coverage, not as verified prize opportunities.

| Name in the roster | What is established | What remains needed |
| --- | --- | --- |
| ACK / @ack3ai | Handle appears among thanked sponsors | Exact product/company identity, official sponsor page, prize amount, integration terms |
| PingMe / @PingMe_xyz | Handle appears among thanked sponsors | Exact product/company identity, official sponsor page, prize amount, integration terms |

Do not confuse a community sponsor list with the final official roster. Additional partners or updated terms may exist inside the portal.

## 7. Allocard-specific comparison

This section is analysis based on the repository reviewed on 11 October. It is not a claim of bounty eligibility or production readiness.

| Objective | Candidates | How to choose |
| --- | --- | --- |
| Smooth employee sign-in and signing | Privy, Dynamic, Mera | Privy already exists in the code. Compare alternatives only if they solve a concrete unmet need. |
| Stable expense amounts | Agora | Strong dollar-budget story; meaningful ERC-20 execution changes required. |
| Treasury funding from other chains | Aurora Intents | Valuable if employers hold assets outside Monad; integration must track final receipt correctly. |
| Finance audit history | Envio | Best match for custom payment/delegation events. |
| Wallet balances and portfolio data | Zerion, Nansen | Choose endpoints that answer a real finance question; verify data coverage and cost. |
| Counterparty enrichment | Nansen, potentially Cleanverse | Analytics labels and verified attestations serve different purposes; neither is a blanket guarantee. |
| AI policy/research workflow | Kimi, Qwen, potentially Hunyuan | Compare accuracy, structured outputs, latency and terms on the same examples. |
| Managed RPC and operations | Alchemy, QuickNode, Crouton, Blockvision, potentially Chainstack | Choose using reliability, method support, cost after credits and compatibility. |
| Transaction diagnosis | Tenderly | Useful during migration and before recording a demo. |
| Treasury spot conversion | Kuru | Appropriate only if swapping is a real feature and the required execution path is used. |
| Derivatives or trading agent product | Perpl, MetaMask Agent Wallet | Larger product expansion; limited relevance to basic company expenses. |
| External data-driven onchain workflow | Chainlink | Require a concrete use case and actual bounty brief before investing time. |

### My evaluation order

1. **Privy:** finish and demonstrate the full existing integration.
2. **Envio or Aurora Intents:** choose auditability or treasury funding according to the biggest user problem.
3. **Agora:** valuable product improvement once execution and token constraints are ready; separately verify the narrow bounty brief.
4. **Kimi or Qwen:** evaluate one model provider through a real workflow, not several superficial integrations.
5. **Infrastructure perks:** redeem useful offers without treating all face values as cash.
6. **Other sponsors:** pursue only when their terms align with a feature you actually want.

This order balances product fit and incremental effort. It is not an estimate of winning probability: competitor count, judging preferences and submission quality are unknown.

### Current implementation facts affecting the decision

- [Web3Providers.tsx](./apps/web/components/Web3Providers.tsx) configures Google/email login and embedded wallets through Privy.
- [chain.ts](./apps/web/lib/chain.ts) selects Monad Testnet.
- [Travel execution](./apps/web/app/api/agents/travel/book/route.ts), [procurement execution](./apps/web/app/api/agents/procurement/book/route.ts), and [reimbursement execution](./apps/web/app/api/agents/reimbursement/claim/route.ts) still contain explicit Sepolia clients/environment references.
- [ai.ts](./apps/web/lib/ai.ts) uses the Qwen 3.8 Max endpoint via Alibaba Cloud Model Studio.
- The existing [README](./README.md) describes native-asset spending controls and an earlier Sepolia demo. It also discloses that travel/procurement payments are demo flows without live merchant fulfillment.

These observations mean a selected Monad chain in the frontend is not yet sufficient evidence that the complete agent payment flow executes on Monad. Resolve this before spending the remaining submission time on unrelated sponsors.

## 8. Personal evaluation worksheet

Complete one row for each serious candidate after opening its official portal entry.

| Question | Your answer |
| --- | --- |
| Sponsor and exact bounty title | |
| Official rule URL and date checked | |
| Total cash/monetary pool | |
| Amount per winner and number of winners | |
| Payout currency/method | |
| Credits/perks, separately valued | |
| Required SDK/API/model/contracts | |
| Required network: mainnet or testnet | |
| Required app format: web, mobile, plugin, etc. | |
| Existing-project eligibility | |
| Required new work during the build window | |
| Required demo, transaction evidence and repository access | |
| Whether multiple sponsor awards can be combined | |
| Feature this improves for Allocard users | |
| Work remaining and integration dependencies | |
| Can it be demonstrated reliably before submission? | |
| Cost after credits expire | |
| Keep / investigate / skip | |

For a subjective comparison, score **product fit, readiness, clarity of eligibility, demo strength and lasting value** from 1–5. Record integration effort separately as low/medium/high. Avoid a numerical “expected prize value” without evidence about the number and quality of competing submissions.

## 9. Questions still requiring the official portal or sponsor confirmation

- Full current sponsor roster and complete bounty rules.
- Amounts for Chainlink, Alibaba Cloud, Cleanverse, Tencent and other unquantified supporters.
- Winner splits, award stacking, payout forms and participant restrictions.
- Agora's mobile/Mera/remittance requirements and MetaMask's trading/plugin scope.
- Accepted Monad deployment network and evidence requirements.
- Treatment of pre-existing projects, earlier hackathon submissions and previously completed sponsor integrations.
- Exact credit redemption, expiry, product exclusions and renewal terms.
- Final deadline timezone and the current grand-prize allocation.

The source links in each profile distinguish what was found from what remains unknown. A working sponsor integration may be useful to Allocard even when it does not satisfy a bounty; a large advertised prize may require a product you do not want to build.
