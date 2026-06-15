'use client'

import { type Web3AuthContextConfig } from '@web3auth/modal/react'
import { WEB3AUTH_NETWORK } from '@web3auth/modal'

const WEB3AUTH_STATE_STORAGE_KEY = 'Web3Auth-state'

type Web3AuthStateStorage = {
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string) => Promise<void>
  remove: (key: string) => Promise<void>
}

/**
 * Custom storage that persists Web3Auth session to localStorage.
 *
 * On `get`: if the cached connector is NOT the in-app (embedded wallet)
 * connector, we nullify it so Web3Auth doesn't try to reconnect to an
 * external wallet (like MetaMask extension) that is no longer available.
 * The in-app connector session is preserved as-is for seamless reconnection.
 */
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

const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID

if (!clientId) {
  throw new Error(
    '[Web3Auth] NEXT_PUBLIC_WEB3AUTH_CLIENT_ID is not set. ' +
      'Add it to .env.local for local development.'
  )
}

const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    authBuildEnv: 'production',
    storage: web3AuthStorage,
    uiConfig: {
      uxMode: "popup",
    },
  },
}

export default web3AuthContextConfig
