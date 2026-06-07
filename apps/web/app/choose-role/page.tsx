'use client'

import { useRouter } from "next/navigation"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, UserCircle } from "lucide-react"

export default function ChooseRolePage() {
  const router = useRouter()

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-background p-4 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">Choose Your Role</h1>
          <p className="text-muted-foreground">Select how you want to interact with Allocard today.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card 
            className="cursor-pointer transition-all hover:bg-muted/50 border-2 border-transparent hover:border-primary bg-card/50"
            onClick={() => router.push('/employer')}
          >
            <CardHeader className="text-center pb-8 pt-8">
              <div className="mx-auto mb-4 rounded-full bg-primary/10 p-4 w-fit">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">Employer</CardTitle>
              <CardDescription className="text-base mt-2">
                Manage company funds, deploy agents, and issue expense cards to employees.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:bg-muted/50 border-2 border-transparent hover:border-primary bg-card/50"
            onClick={() => router.push('/employee')}
          >
            <CardHeader className="text-center pb-8 pt-8">
              <div className="mx-auto mb-4 rounded-full bg-primary/10 p-4 w-fit">
                <UserCircle className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">Employee</CardTitle>
              <CardDescription className="text-base mt-2">
                View your active expense limits and redelegate to AI agents or external addresses.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
}