# Allocard

**Allocard** is a trustless corporate expense card system. It reimagines how companies handle spending by giving employees and AI agents the authority to spend company funds *without ever actually transferring the money to them in advance*. 

Instead of issuing physical credit cards and hoping employees follow company policy, Allocard uses smart contracts to enforce the rules. A company issues a "delegation"—a cryptographic permission that allows an employee to spend funds directly from the company's master account, but strictly bounded by the rules defined by the employer.

### Built for the MetaMask Hackathon
Allocard was built for the MetaMask Hackathon, leveraging the MetaMask Smart Accounts Kit (ERC-7710 delegation). It targets three main tracks:
- **Best Agent:** A Reimbursement Agent that uses Venice AI reasoning to evaluate claims and redeem on-chain delegations.
- **Best Venice AI:** Uses Venice AI for reasoning and vision (like OCR on receipts) at two touchpoints: pre-spend advisory and autonomous policy checks.
- **Best A2A Coordination:** Demonstrates complex multi-hop delegation chains where authority flows seamlessly from Company → Employee → AI Agent.

---

## What to Expect: App Modules & Dashboards

Allocard provides a complete, seamless web application experience split into two dedicated interfaces so both accounting and staff have the tools they need.

### The Employer Dashboard
When an employer logs in, they are greeted with a visual, interactive canvas. This is the command center for company spending.
- **The Master Card:** A permanent node on the canvas representing the company's smart account. All funds branch out from here.
- **Visual Delegation Tree:** Employers can drag and drop employees from their sidebar onto the canvas. This creates a visual tree showing exactly who has access to company funds.
- **Granular Controls:** By clicking on an employee node, the employer opens a configuration drawer to set precise rules (caveats). They can set lifetime maximums, recurring period allowances (e.g., $500/month), single transaction caps, limited usage counts, or even restrict spending to specific allowed vendor addresses.

### The Employee Dashboard
Employees don't just get a simple balance screen; they get their own powerful dashboard to manage their granted authority.
- **Personal Canvas:** Employees see a clear visual of the inbound delegation from the company (what they are allowed to spend). 
- **Redelegation Hub:** Employees can create their own outgoing "redelegations." For example, they can branch their own node to send spending authority to AI agents.
- **Agent Picker Sidebar:** Employees can browse approved platform AI agents from their sidebar, select one, and assign it a specific portion of their budget to act on their behalf.

---

## How the AI Agents Work

Allocard's true power comes from its platform AI agents, powered by **Venice AI**. Instead of employees doing all the manual work, they delegate tasks—and budgets—to these agents.

- **Reimbursement Agent (Core):** If an employee makes an out-of-pocket purchase, they can submit a claim to this agent. The agent uses **Vision AI (OCR)** to scan the uploaded receipt, reads the total amount, and uses text reasoning to ensure the claim matches the employee's available budget and policy rules. If approved, the agent autonomously executes an on-chain transfer to reimburse the employee instantly.
- **Pre-Spend Advisory:** Venice AI is also used at the advisory level, helping employees check if a planned expense is within policy before they make it.
- **Travel & Procurement Agents :** The platform is designed to support further specialized agents, such as a Travel Agent that can autonomously book flights from a redelegated budget, or a Procurement Agent for ordering office supplies.

---

## Additional Key Features

**Trustless Spending Enforcement**
Rules are enforced on-chain, not by HR policy. If an employee or agent tries to spend more than they are allowed, the blockchain simply rejects the transaction. Funds never leave the company's account until a valid, within-policy transaction is executed.

**Seamless Passwordless Onboarding**
The app is entirely passwordless, using MetaMask Embedded Wallets to create a frictionless Web2-like experience.
- Employers connect to create a company and generate simple invite links.
- Employees click the invite link, authenticate, and instantly get their own smart account provisioned in the background.


**Multi-Hop Delegation**
Authority flows seamlessly through the system: **Company → Employee → AI Agent**. The employee acts as a middleman who can slice up their own budget and pass it to agents, but the AI agent still pulls the final funds directly from the Company master card.

**Real-Time Revocation**
An employer can instantly revoke an employee's spending authority at the click of a button. Because delegations are chained together, revoking an employee's authority automatically cascades and revokes any permissions that the employee gave to their AI agents.
