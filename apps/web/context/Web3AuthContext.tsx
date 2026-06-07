'use client'

import { type Web3AuthContextConfig } from '@web3auth/modal/react'
import { WEB3AUTH_NETWORK } from '@web3auth/modal'

// TODO(security): Ensure NEXT_PUBLIC_WEB3AUTH_CLIENT_ID is set in .env.local for development
// and proper secrets management (e.g. Vercel env vars) for production.
// Never hard-code the clientId; fail loud if it is missing.
const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID

if (!clientId) {
  throw new Error(
    '[Web3Auth] NEXT_PUBLIC_WEB3AUTH_CLIENT_ID is not set. ' +
      'Add it to .env.local for local development.'
  )
}

// Use SAPPHIRE_DEVNET for local development (http://localhost).
// Sapphire Mainnet does not allow localhost origins.
// Switch to WEB3AUTH_NETWORK.SAPPHIRE_MAINNET for production.
const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    authBuildEnv: 'production',
  },
}

export default web3AuthContextConfig
