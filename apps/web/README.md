<div align="center">
  <img src="./public/AllocardLogoBlack.svg" alt="Allocard Logo" width="150" />
</div>

# Allocard Web Application

This is the Next.js frontend for Allocard, a trustless corporate expense card system.

## Setup

1.  **Install dependencies**:
    ```bash
    pnpm install
    ```

2.  **Environment Variables**:
    Create a `.env.local` file in this directory with the following variables:
    ```env
    NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
    PRIVY_APP_ID=your_privy_app_id
    PRIVY_APP_SECRET=your_privy_app_secret
    SESSION_SECRET=generate_a_random_secret_at_least_32_characters_long
    NEXT_PUBLIC_BUNDLER_RPC_URL=your_bundler_rpc_url
    NEXT_PUBLIC_PAYMASTER_RPC_URL=your_paymaster_rpc_url
    NEXT_PUBLIC_PIMLICO_SPONSOR_ID=your_pimlico_sponsor_id (if required)
    DATABASE_URL=your_neon_postgres_connection_string
    ```

3.  **Run the development server**:
    ```bash
    pnpm dev
    ```

## Architecture

- **Framework**: Next.js (App Router)
- **UI Components**: shadcn/ui
- **Authentication**: Privy Google/email login with server-verified sessions
- **Web3 Integration**: MetaMask Smart Accounts Kit, Wagmi, Viem
- **State Management**: React Context, React Query
- **Canvas**: React Flow (for delegation tree visualization)

## Target Chain

Allocard currently targets **ETH Sepolia**.

Employers add employees by verified email. Employees accept pending memberships in the workspace picker. A signed-in user can switch between their company and role memberships from the dashboard sidebar.
