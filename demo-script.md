# Allocard - 3-Minute Demo Video Script

**Track:** Product & Consumer Track (Monad Metropolis Hackathon)  
**Target Duration:** ~2:45 - 2:50 (Optimized for Text-To-Speech synthesis under 3 minutes)  
**Word Count:** ~340 words  
**Tone:** Direct, confident, conversational founder walkthrough. No marketing fluff, zero em-dashes.

---

## Recording Setup & Checklist

1. **Browser Windows (Pre-loaded):**
   - **Tab 1:** Landing Page (`http://localhost:3000`)
   - **Tab 2:** Employer Dashboard (`http://localhost:3000/employer`)
   - **Tab 3:** Employee Dashboard (`http://localhost:3000/employee`)
   - **Tab 4:** Monad Explorer (`https://testnet.monadexplorer.com`)
2. **Assets Ready:**
   - Sample test receipt: `apps/web/public/SampleReciept.jpg` (or click "Use sample receipt" directly in the drawer).
   - A valid test EVM address handy for direct spend demo.
3. **Screen Setup:**
   - 1080p or 4K resolution, browser zoom at 100%, clean dark mode, system notifications silenced.

---

## Complete Text-To-Speech (TTS) Narration Script

Copy this entire block directly into your Text-to-Speech agent (ElevenLabs, OpenAI Audio, or similar):

```text
Corporate spending is broken. Giving employees and AI agents cards or pre-funded wallets puts your capital at risk. You either chase down runaway charges weeks later, or send crypto upfront and lose custody immediately.

Allocard fixes this with programmable spending permissions. Funds never enter the employee's wallet. Every dollar stays in your company account until an approved purchase occurs.

On the Employer Dashboard, the Delegation Canvas gives you a live visual map of your company spending. We add an employee by email, select their node, and set their spending rules using the controls here, like how much they can spend, where they can spend it, or how often their limit resets. Our smart account signs this onchain permission via MetaMask Delegation Core. Zero cash moves into their account, because all funds stay in the company treasury.

Switching to the Employee Dashboard, our spending limit is ready to use, while the money stays safely in the company account.

To pay for an expense, the employee simply fills in the details and clicks Execute. The payment settles on Monad in under a second directly from the company account. Then they upload the receipt, which an AI agent analyzes to flag any policy issues.

If an employee paid for a business expense with their own personal money, getting reimbursed is effortless. They upload their receipt, the AI reads the items to verify company rules, and pays them back automatically.

Employees can also share part of their budget with AI agents. For example, our Cloud and Tooling Agent can research developer tools, pick the best plan, and buy it on its own, but it can never spend more than the limit we give it.

Allocard is not just limited to onchain payments either. Using Agora, employees can spend company funds offchain too, settling real-world expenses and foreign invoices at live exchange rates with zero bank wire fees.

Corporate spending should not mean risking your company capital. Allocard gives your team and AI agents the freedom to spend, while keeping one hundred percent of your treasury safe.

Thank you.
```

---

## Scene-by-Scene Visual Timing Reference

| Scene | Time | On-Screen Action | Spoken Core Point |
| :--- | :--- | :--- | :--- |
| **1. Problem & Innovation** | 0:00 - 0:25 | Landing page hero & problem section | Money never enters employee wallets; funds stay in company account. |
| **2. Canvas & Spending Rules** | 0:25 - 0:55 | Add employee by email -> Click node on canvas -> Configure spending controls | EIP-712 permission signed onchain; zero cash moves upfront. |
| **3. Employee Direct Spend** | 0:55 - 1:25 | Switch to Employee Dashboard -> Enter details in Direct Spend -> Click Execute | Sub-second settlement directly from company account; AI receipt scan. |
| **4. AI Reimbursements** | 1:25 - 1:55 | Click Reimbursement -> Upload receipt -> AI auto-verifies and reimburses | Paying back staff who spent personal money is fully automated. |
| **5. AI Tooling Agent** | 1:55 - 2:25 | Open Cloud & Tooling Agent -> Scour RPC nodes -> Procure Chainstack plan | Agent researches and buys infrastructure on its own, capped mathematically. |
| **6. Agora Offchain & Close** | 2:25 - 2:48 | Click Global Remittances -> Show EUR/GBP to AUSD live conversion | Spending company funds offchain with live FX and zero wire fees; closing vision. |
