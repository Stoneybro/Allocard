'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useWeb3AuthConnect, useWeb3AuthDisconnect } from '@web3auth/modal/react'
import {
  createBundlerClient,
  createPaymasterClient,
} from 'viem/account-abstraction'
import { http } from 'viem'
import { baseSepolia } from 'viem/chains'

import { publicClient } from '@/lib/client'
import { createInjectedWalletClient } from '@/lib/signer'
import { createHybridSmartAccount } from '@/lib/smartAccount'

type DeploymentState = {
  hash: `0x${string}` | null
  smartAccountAddress: `0x${string}` | null
  error: string | null
  deploying: boolean
  deployed: boolean
}

const initialDeploymentState: DeploymentState = {
  hash: null,
  smartAccountAddress: null,
  error: null,
  deploying: false,
  deployed: false,
}

function formatAddress(address: string | undefined) {
  if (!address) return 'Not connected'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function WalletDashboard() {
  const { connect, loading, isConnected } = useWeb3AuthConnect()
  const { disconnect } = useWeb3AuthDisconnect()
  const { address } = useAccount()
  const [deployment, setDeployment] = useState<DeploymentState>(
    initialDeploymentState,
  )

  const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL
  const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL
  const sponsorId = process.env.NEXT_PUBLIC_PIMLICO_SPONSOR_ID

  const handleDisconnect = async () => {
    setDeployment(initialDeploymentState)
    await disconnect()
  }

  const handleDeploy = async () => {
    setDeployment((current) => ({
      ...current,
      deploying: true,
      error: null,
    }))

    try {
      if (!address) {
        throw new Error('No wallet address available after authentication')
      }

      if (!bundlerUrl) {
        throw new Error(
          'Missing NEXT_PUBLIC_BUNDLER_RPC_URL. Add a bundler endpoint in .env.local to send the deployment user operation.',
        )
      }

      if (!paymasterUrl) {
        throw new Error(
          'Missing NEXT_PUBLIC_PAYMASTER_RPC_URL. Add a Pimlico paymaster endpoint in .env.local to enable sponsorship.',
        )
      }

      const walletClient = createInjectedWalletClient(address)
      const smartAccount = await createHybridSmartAccount(walletClient)
      const paymasterClient = createPaymasterClient({
        transport: http(paymasterUrl),
      })
      const bundlerClient = createBundlerClient({
        client: publicClient,
        chain: baseSepolia,
        paymaster: paymasterClient,
        paymasterContext: sponsorId ? { policyId: sponsorId } : undefined,
        transport: http(bundlerUrl),
      })

      const userOperationHash = await bundlerClient.sendUserOperation({
        account: smartAccount,
        calls: [
          {
            to: address,
            value: 0n,
          },
        ],
      })

      setDeployment((current) => ({
        ...current,
        hash: userOperationHash,
      }))

      await bundlerClient.waitForUserOperationReceipt({
        hash: userOperationHash,
      })

      const deployed = await smartAccount.isDeployed()

      if (!deployed) {
        throw new Error(
          'The user operation completed, but the smart account is still not reported as deployed.',
        )
      }

      setDeployment({
        hash: userOperationHash,
        smartAccountAddress: smartAccount.address,
        error: null,
        deploying: false,
        deployed: true,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Deployment failed'

      setDeployment((current) => ({
        ...current,
        deploying: false,
        error: message,
      }))
    }
  }

  if (!isConnected) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
              Step 1
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Authenticate with MetaMask Embedded Wallets
            </h2>
          </div>
          <button
            id="connect-wallet-btn"
            onClick={() => connect()}
            disabled={loading}
            className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-5 rounded-3xl border border-white/10 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
            Connected Wallet
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Ready to deploy the smart account
          </h2>
        </div>
        <button
          id="disconnect-wallet-btn"
          onClick={() => void handleDisconnect()}
          className="w-fit rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Log out
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Wallet Address
          </p>
          <p className="mt-2 break-all font-mono text-sm">
            {address ?? 'Unavailable'}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-4 text-slate-900">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Smart Account
          </p>
          <p className="mt-2 font-mono text-sm">
            {deployment.smartAccountAddress ?? 'Not deployed yet'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">
              Deploy the smart account
            </p>
            <p className="text-sm text-slate-500">
              Sends a user operation on Base Sepolia through your bundler.
            </p>
          </div>
          <button
            id="deploy-smart-account-btn"
            onClick={() => void handleDeploy()}
            disabled={deployment.deploying}
            className="w-fit rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deployment.deploying ? 'Deploying...' : 'Deploy Smart Account'}
          </button>
        </div>

        <div className="grid gap-2 text-sm text-slate-600">
          <p>
            Network: <span className="font-medium text-slate-900">Base Sepolia</span>
          </p>
          <p>
            Address:{' '}
            <span className="font-mono text-slate-900">
              {formatAddress(address)}
            </span>
          </p>
          <p>
            Deployment hash:{' '}
            <span className="font-mono text-slate-900">
              {deployment.hash ?? 'Pending'}
            </span>
          </p>
          {deployment.deployed ? (
            <p className="font-medium text-emerald-700">
              Smart account deployed successfully.
            </p>
          ) : null}
          {deployment.error ? (
            <p className="font-medium text-red-600">{deployment.error}</p>
          ) : null}
          {!bundlerUrl ? (
            <p className="font-medium text-amber-700">
              Set `NEXT_PUBLIC_BUNDLER_RPC_URL` in `.env.local` to enable the
              deployment call.
            </p>
          ) : null}
          {!paymasterUrl ? (
            <p className="font-medium text-amber-700">
              Set `NEXT_PUBLIC_PAYMASTER_RPC_URL` in `.env.local` to enable gas
              sponsorship.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
