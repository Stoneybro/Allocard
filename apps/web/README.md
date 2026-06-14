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
    NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=your_web3auth_client_id
    NEXT_PUBLIC_BUNDLER_RPC_URL=your_bundler_rpc_url
    NEXT_PUBLIC_PAYMASTER_RPC_URL=your_paymaster_rpc_url
    NEXT_PUBLIC_PIMLICO_SPONSOR_ID=your_pimlico_sponsor_id (if required)
    # Database variables will be added in Phase 2
    ```

3.  **Run the development server**:
    ```bash
    pnpm dev
    ```

## Architecture

- **Framework**: Next.js (App Router)
- **UI Components**: shadcn/ui
- **Web3 Integration**: MetaMask Smart Accounts Kit, Wagmi, Viem, Web3Auth
- **State Management**: React Context, React Query
- **Canvas**: React Flow (for delegation tree visualization)

## Target Chain

Allocard currently targets **Base Sepolia**.
