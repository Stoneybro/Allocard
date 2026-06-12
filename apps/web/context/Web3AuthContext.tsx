'use client'

import { type Web3AuthContextConfig } from '@web3auth/modal/react'
import { WEB3AUTH_NETWORK } from '@web3auth/modal'

const WEB3AUTH_STATE_STORAGE_KEY = 'Web3Auth-state'
const IN_APP_CONNECTOR_ID = 'auth'

type Web3AuthStateStorage = {
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string) => Promise<void>
  remove: (key: string) => Promise<void>
}

class FilteredWeb3AuthStateStorage implements Web3AuthStateStorage {
  private memory = new Map<string, string>()

  private getLocalStorage() {
    if (typeof window === 'undefined') return null

    try {
      return window.localStorage
    } catch {
      return null
    }
  }

  async get(key: string) {
    const storage = this.getLocalStorage()
    const value = storage?.getItem(key) ?? this.memory.get(key) ?? null

    if (!value || key !== WEB3AUTH_STATE_STORAGE_KEY) {
      return value
    }

    try {
      const parsed = JSON.parse(value) as {
        cachedConnector?: string | null
        primaryConnectorName?: string | null
        activeAccount?: unknown
      }

      if (parsed.cachedConnector && parsed.cachedConnector !== IN_APP_CONNECTOR_ID) {
        parsed.cachedConnector = null

        if (parsed.primaryConnectorName && parsed.primaryConnectorName !== IN_APP_CONNECTOR_ID) {
          parsed.primaryConnectorName = null
          parsed.activeAccount = null
        }

        return JSON.stringify(parsed)
      }
    } catch {
      return value
    }

    return value
  }

  async set(key: string, value: string) {
    const storage = this.getLocalStorage()

    if (storage) {
      storage.setItem(key, value)
      return
    }

    this.memory.set(key, value)
  }

  async remove(key: string) {
    const storage = this.getLocalStorage()

    if (storage) {
      storage.removeItem(key)
      return
    }

    this.memory.delete(key)
  }
}

const web3AuthStorage = {
  sessionId: new FilteredWeb3AuthStateStorage(),
} as unknown as NonNullable<Web3AuthContextConfig['web3AuthOptions']['storage']>

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
    storage: web3AuthStorage,
    uiConfig: {
      hideSuccessScreen: true,
    },
  },
}

export default web3AuthContextConfig
