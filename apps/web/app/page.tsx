'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWeb3AuthConnect } from "@web3auth/modal/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldCheck, Workflow, Wallet } from "lucide-react"

export default function LandingPage() {
  const router = useRouter()
  const { connect, loading, isConnected } = useWeb3AuthConnect()
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    // Only automatically redirect if the user initiated the connection process
    // from this landing page to avoid unwanted auto-redirects on page load.
    if (isConnecting && isConnected) {
      router.push('/choose-role')
    }
  }, [isConnected, isConnecting, router])

  const handleConnect = () => {
    if (isConnected) {
      router.push('/choose-role')
    } else {
      setIsConnecting(true)
      connect()
    }
  }

  return (
    <div className="flex h-full flex-col bg-background text-foreground overflow-y-auto">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="size-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            A
          </div>
          Allocard
        </div>
        <nav>
          <Button 
            variant="outline" 
            onClick={handleConnect} 
            disabled={loading && !isConnecting}
          >
            {loading && isConnecting ? 'Connecting...' : 'Login'}
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-6 py-24 sm:py-32 flex flex-col items-center text-center space-y-10">
          <div className="space-y-4 max-w-4xl">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              Trustless Corporate <br className="hidden sm:block" /> Expense Cards
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Give employees and AI agents spending authority without transferring funds. 
              Built on MetaMask Smart Accounts with on-chain caveat enforcement.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              onClick={handleConnect} 
              disabled={loading && !isConnecting}
              className="px-8 h-12 text-base"
            >
              {loading && isConnecting ? 'Connecting...' : 'Get Started'}
            </Button>
          </div>
        </section>

        <section className="border-t bg-muted/20">
          <div className="container mx-auto px-6 py-24 sm:py-32">
            <div className="grid gap-8 sm:grid-cols-3">
              <Card className="bg-background/50 backdrop-blur border-muted/50 pt-6">
                <CardContent className="space-y-4">
                  <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
                    <ShieldCheck className="text-primary w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold">On-Chain Enforcement</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Spending limits, merchant restrictions, and expiration rules are enforced at the smart contract level, not policy level.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/50 backdrop-blur border-muted/50 pt-6">
                <CardContent className="space-y-4">
                  <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
                    <Workflow className="text-primary w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold">Agent Coordination</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Seamlessly delegate spending authority to AI agents. Let autonomous systems execute purchases within strict parameters.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/50 backdrop-blur border-muted/50 pt-6">
                <CardContent className="space-y-4">
                  <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
                    <Wallet className="text-primary w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold">No Capital Lockup</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Funds remain in the company&apos;s master account until the moment a transaction is executed by an authorized delegatee.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:py-8 flex items-center justify-center bg-background text-sm text-muted-foreground">
        <p>Built for the MetaMask Hackathon.</p>
      </footer>
    </div>
  )
}
