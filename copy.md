# Allocard: UX Flow & Copy

This document outlines the user experience (UX) flow and the associated messaging (copy) for Allocard. Allocard is a trustless corporate expense platform built on MetaMask Smart Accounts with on-chain caveat enforcement.

---

## 1. Landing Page (`/`)
*The entry point for all users. Explains the value proposition and handles initial authentication.*

### Visual Flow
- **Header**: Logo (Allocard) and a "Login" button.
- **Hero Section**: Large bold headline and a primary call-to-action (CTA).
- **Features Section**: Three cards highlighting technical and business benefits.
- **Footer**: Simple attribution ("Built for the MetaMask Hackathon").

### Copy
- **Main Headline**: Trustless Corporate Expense Cards
- **Sub-headline**: Give employees and AI agents spending authority without transferring funds. Built on MetaMask Smart Accounts with on-chain caveat enforcement.
- **CTA Button**: Get Started / Login
- **Feature Card 1 (Security)**: 
    - **Title**: On-Chain Enforcement
    - **Detail**: Spending limits, merchant restrictions, and expiration rules are enforced at the smart contract level, not policy level.
- **Feature Card 2 (Innovation)**: 
    - **Title**: Agent Coordination
    - **Detail**: Seamlessly delegate spending authority to AI agents. Let autonomous systems execute purchases within strict parameters.
- **Feature Card 3 (Efficiency)**: 
    - **Title**: No Capital Lockup
    - **Detail**: Funds remain in the company's master account until the moment a transaction is executed by an authorized delegatee.

---

## 2. Onboarding (`/onboarding`)
*Triggered after a new user connects their wallet for the first time.*

### Visual Flow
- **Status Indicator**: "Connected wallet" badge at the top.
- **Role Selection**: Two large cards side-by-side representing the two user personas: **Company Owner** or **Employee**.

### Copy
- **Header**: Set up your Allocard workspace
- **Sub-header**: Create a company account or use an invite link from your company to join as an employee.
- **Employer Card**:
    - **Title**: Create a company
    - **Description**: Start as the company owner and manage employee spending permissions.
    - **Input Label**: Company name (Placeholder: "Acme Labs")
    - **Button**: Create company
- **Employee Card**:
    - **Title**: Join as an employee
    - **Description**: Employees join Allocard through an invite link from their company.
    - **Button**: I am an employee
    - **Instructional Note (Conditional)**: Ask your company admin to send you an Allocard invite link. Open that link once with this wallet to join the right company.

---

## 3. Employee Invitation (`/invite/[code]`)
*The destination for a shareable invite link.*

### Visual Flow
- **Card**: A focused invitation card in the center of the screen.
- **State Handling**: Handles "Invite not found," "Expired," or "Already accepted" states.

### Copy
- **Header**: Join [Company Name]
- **Description**: This will link your connected wallet to the company as an employee. You only need this invite once.
- **CTA Button**: Join company
- **Error States**:
    - *Expired*: This invite has expired. Ask your company admin for a new link.
    - *Already Accepted*: This invite has already been accepted. If it was accepted with this wallet, continuing will take you to your employee dashboard.
    - *Invalid*: This invite link is invalid or has been removed.

---

## 4. Employer Dashboard (`/employer`)
*The central management hub for company owners.*

### Visual Flow
- **Shell**: Sidebar with navigation and a user profile section.
- **Summary Section**: Four status cards at the top (Employees, AI Agents, Active Delegations, Delegated ETH).
- **Main Content**: A "Flow Canvas" (Visual mapping of delegations) and management controls.
- **Activation Area**: A button to "Activate smart account" if not yet deployed.

### Copy
- **Page Title**: Company dashboard
- **Role Label**: Company owner
- **Summary Cards**:
    - **Employees**: Total count of registered employees.
    - **AI Agents**: Total count of provisioned agents.
    - **Active Delegations**: Number of live spending permissions.
    - **Delegated native ETH**: Total allowance across all caveats (e.g., "1.5 ETH").
- **Canvas Action**: Activate smart account (Sponsors deployment of the company's master account).
- **Sidebar Actions**: 
    - **Create Invite Link**: Generates a shareable URL for new employees.
    - **Copy Invite**: Copies the URL to the clipboard (Updates to "Copied!" feedback).

---

## 5. Employee Dashboard (`/employee`)
*The personal workspace for team members.*

### Visual Flow
- **Status Card**: Confirms company membership and displays wallet/smart account details.
- **Spending Card**: A placeholder for active delegations.
- **Activation Area**: A button to "Activate smart account" to enable delegated spending.

### Copy
- **Page Title**: Employee dashboard
- **Role Label**: Employee
- **Status Section**:
    - **Header**: Employee access is active
    - **Description**: This wallet is linked to [Company Name]. Future visits load this company automatically, without the invite link.
    - **Data Labels**: Smart account address, Company name.
- **Activation Button**: Activate smart account (Deploys the employee's personal smart account).
- **Spending Authority Section**:
    - **Title**: Spending authority
    - **Empty State**: No active delegations yet. Delegations from your company will appear here in the next phase.

---

## 6. Global Components
*Shared UI elements and messaging used across pages.*

### Auth States
- **Connect Required**: 
    - **Title**: Connect wallet
    - **Description**: You need to connect your wallet to access this workspace.
- **Loading**: Loading company workspace... / Checking access...

### Smart Account Status
- **Pending**: Smart account pending
- **Active**: [Formatted Hex Address] (e.g., 0x1234...5678)
- **Deployment Action**: Activating... / Rocket Icon
