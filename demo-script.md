# Allocard - 3-Minute Demo Video Script

**Track:** Product & Consumer Track (Monad Metropolis Hackathon)  
**Target Duration:** 3 minutes (180 seconds)  
**Tone:** Direct, confident, conversational founder walkthrough. No marketing fluff, no AI cliches, zero em-dashes.

---

## Recording Setup & Checklist

1. **Browser Windows (Pre-loaded):**
   - **Tab 1:** Landing Page (`http://localhost:3000`)
   - **Tab 2:** Employer Dashboard (`http://localhost:3000/employer`) with funded treasury (use `+10k AUSD` if testing on fresh database).
   - **Tab 3:** Employee Dashboard (`http://localhost:3000/employee`)
   - **Tab 4:** Monad Explorer (`https://testnet.monadexplorer.com`)
2. **Assets Ready:**
   - Sample test receipt file: `apps/web/public/SampleReciept.jpg` (or click the built-in "Use sample receipt" button directly in the drawer).
3. **Screen Setup:**
   - 1080p or 4K resolution, browser zoom at 100%, dark/light OS mode clean, notifications silenced.

---

## Scene-by-Scene Production Script

### Scene 1: The Problem with Corporate Spending
- **Time:** 0:00 - 0:30 (30 seconds)
- **Visual:**
  - Start on the Allocard Landing Page (`http://localhost:3000`).
  - Scroll past the hero banner down to the comparison section showing traditional corporate cards versus Allocard.
  - Hover over the flow diagram: Company Account -> Spending Permissions -> Team & AI Agents -> Monad Instant Settlement.
- **Voiceover:**
  > "Corporate expense cards are broken.
  > 
  > Today, if you run a company, you are stuck with two bad options. You can hand an employee a corporate credit card with a high credit limit and hope they do not overspend. Or you can pre-fund a debit card with cash upfront, which locks up your working capital and gives up control. Either way, finance teams only find unauthorized charges weeks later during end-of-month reviews.
  > 
  > Allocard solves this by replacing cash transfers with smart spending permissions.
  > 
  > With Allocard, your money never leaves your company account until the exact moment a valid purchase occurs."

---

### Scene 2: 1-Click Onboarding and the Spend Canvas
- **Time:** 0:30 - 0:55 (25 seconds)
- **Visual:**
  - On the landing page, click the **"Sign in"** button.
  - Show the Privy login modal: 1-click Google or corporate email login (no seed phrases, no extension popups).
  - Transition immediately into the **Employer Dashboard** (`/employer`).
  - Highlight the top card: **Company Treasury Balance** showing 10,000 Agora AUSD.
  - Center screen on the **Delegation Canvas**: an interactive visual tree showing the Company Treasury at the root, branching out to team members and sub-delegated AI agents.
- **Voiceover:**
  > "Getting started takes under thirty seconds. There are no seed phrases, no crypto wallet extensions, and no blockchain jargon. Anyone on your team logs in with their existing Google account or corporate email.
  > 
  > Here is the Employer Dashboard. At the top is our company treasury balance in Agora digital dollars on Monad.
  > 
  > In the center is the Spending Canvas. It gives you a live visual map of your company finances. You see your corporate account at the center, branching out to team members, and from team members to their software agents. You have complete visual control over who can spend, their exact limits, and active delegations."

---

### Scene 3: Defining Guardrails Without Moving Cash
- **Time:** 0:55 - 1:25 (30 seconds)
- **Visual:**
  - On the Delegation Canvas, click an employee node to open the **Rule Configuration Drawer**.
  - Fill in the policy controls:
    - Set **Monthly Allowance:** `200 AUSD`
    - Set **Per-Transaction Cap:** `100 AUSD`
    - Enter **Natural Language Policy:** *"Cloud infrastructure, developer tools, and client meals only."*
  - Click **Save Rules**.
  - Point out the Treasury balance card: still reads 10,000 AUSD.
- **Voiceover:**
  > "Setting up spending rules is straightforward. You select an employee and define their limits: a monthly allowance that resets automatically, a per-transaction cap, and a plain English policy rule like cloud tools and client meals only.
  > 
  > Notice that our company balance did not go down. We did not send any cash to this employee. We granted an on-chain permission that only activates when a legitimate purchase matches these rules."

---

### Scene 4: The Autonomous DevOps Agent (Live Demo)
- **Time:** 1:25 - 2:05 (40 seconds)
- **Visual:**
  - Switch to the **Employee Dashboard** (`/employee`).
  - Show the top cards: Approved Limit (200 AUSD), Delegated to Agents (50 AUSD), Remaining Available (150 AUSD).
  - Scroll down to the main tabs: click on the **"Autonomous AI Agents"** tab.
  - Point out the **DevOps Procurement Agent** card showing status *"Authorized on Monad"* with its 50 AUSD sub-allowance.
  - Click **"Launch Agent"**.
  - The **DevOps Procurement Agent Drawer** opens up:
    - Click the category filter pill: **"RPC Nodes"**.
    - Click the **Chainstack** merchant card.
    - Select the **Developer Plan (15 AUSD)**.
    - In the project context field, type: *"Dedicated RPC endpoint for Monad testnet deployment."*
    - Click the button: **"Approve & Procure Developer Plan (15 AUSD)"**.
    - Watch the button state change to: *"Executing On-Chain Purchase on Monad..."* with a live spinner.
    - Success screen appears: green checkmark, *"Infrastructure Successfully Procured!"*, provisioned API Endpoint credential displayed with copy button, and a live link to the Monad Explorer transaction.
- **Voiceover:**
  > "Here is something no traditional corporate card can do: empowering autonomous AI agents.
  > 
  > On the Employee Dashboard, we switch to the Autonomous AI Agents tab. Here is our DevOps Procurement Agent. We granted it a fifty dollar sub-allowance from our budget.
  > 
  > Let us click Launch Agent. Say our engineering team needs a dedicated RPC node. In the drawer, we filter by RPC Nodes, choose Chainstack, pick the Developer Plan for fifteen dollars, and add our project note.
  > 
  > Now we click Approve and Procure.
  > 
  > The agent checks our company policy, validates the merchant address, and executes the purchase on Monad. In just two seconds, the infrastructure is paid for directly from the company treasury, and our live API credentials appear right on screen.
  > 
  > The agent can never spend more than its fifty dollar cap, and if it attempts an unauthorized purchase, the blockchain rejects it automatically."

---

### Scene 5: Instant AI Receipt Reimbursement (Live Demo)
- **Time:** 2:05 - 2:40 (35 seconds)
- **Visual:**
  - Close the DevOps drawer and look at the **AI Expense Reimbursements** card on the Employee Dashboard.
  - Click **"Claim reimbursement"**.
  - The **Reimbursement Drawer** opens.
  - Click **"Testing? Use sample receipt"** (or click "Choose Image" and select `SampleReciept.jpg`).
  - Preview displays the receipt image (Metropolis Tech Bistro).
  - Click the primary button: **"Scan Receipt with AI"**.
  - Loading animation: *"Analyzing receipt... Reading the merchant, date and receipt details"*.
  - Step 3 (Review) appears:
    - Card shows extracted data: Merchant *"Metropolis Tech Bistro"*, Date *"2026-10-12"*, Total *"$46.87 USD"*, and line items (Flat White, Avocado Tartine, Truffle Fries).
    - Description field shows pre-filled text: *"Executive lunch with client to discuss Q4 expansion"*.
    - Claim amount field shows: `46.87` AUSD.
  - Click **"Submit Claim"**.
  - Loading animation: *"Reviewing your reimbursement claim... Checking policy compliance and sending on-chain"*.
  - Success screen: green checkmark, *"Reimbursement Successful"*, confirmation message, and clickable Monad transaction link.
- **Voiceover:**
  > "Now let us look at out-of-pocket expenses.
  > 
  > Usually, an employee pays with personal cash, holds onto a paper receipt, fills out an expense report, and waits weeks for manual review.
  > 
  > With Allocard, the employee opens the Reimbursement drawer and uploads their receipt.
  > 
  > We click Scan Receipt with AI.
  > 
  > Our vision model reads the receipt in real time. It extracts the restaurant name, Metropolis Tech Bistro, the date, individual line items, and the total of forty-six dollars and eighty-seven cents.
  > 
  > When we click Submit Claim, our policy model evaluates the expense against our company rules, confirms the budget, and disburses the reimbursement payout in Agora digital dollars directly on Monad in under two seconds.
  > 
  > No paperwork, no manual manager review, and no delayed payouts."

---

### Scene 6: Global Remittance and Wrap-up
- **Time:** 2:40 - 3:00 (20 seconds)
- **Visual:**
  - Click the **Agora Cross-Border** card on the dashboard to briefly show the cross-border contractor payment drawer (EUR to AUSD conversion with live FX rates).
  - Return to the clean landing page hero or the active Delegation Canvas showing updated balances and audit entries.
- **Voiceover:**
  > "Allocard also handles international payments. Through our Agora cross-border rail, companies settle overseas contractor invoices in seconds at live exchange rates, eliminating forty-dollar bank wire fees.
  > 
  > And with upcoming MercuryOS virtual cards, teams will soon be able to use these exact permissions at any card terminal worldwide.
  > 
  > Allocard keeps your money safe in your company account while giving your employees and AI agents the speed they need.
  > 
  > Thank you."

---

## Presenter Quick Reference

| Beat | Timestamp | Key Screen Action | What to Emphasize |
| :--- | :--- | :--- | :--- |
| **1. Problem** | 0:00 - 0:30 | Landing page scroll | Traditional cards force you to pre-fund or risk credit abuse. |
| **2. Setup** | 0:30 - 0:55 | Sign in -> Employer Dashboard -> Canvas | 1-click Privy login, visual financial tree, zero seed phrases. |
| **3. Rules** | 0:55 - 1:25 | Open Rule Drawer on Canvas -> Set $200 limit | Zero cash leaves the company account until purchase. |
| **4. DevOps Agent** | 1:25 - 2:05 | Employee Dashboard -> Agents tab -> Launch Agent -> Buy Chainstack $15 | Live Monad transaction, instant credential provisioning, hard budget guardrails. |
| **5. AI Reimbursement** | 2:05 - 2:40 | Reimbursement Drawer -> Sample receipt -> Scan -> Submit | Vision OCR reads $46.87, policy engine audits, instant payout on Monad. |
| **6. Close** | 2:40 - 3:00 | Agora remittance card -> Return to Canvas / Hero | Real-time cross-border settlements, no wire fees, absolute treasury control. |
