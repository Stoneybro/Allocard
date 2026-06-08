"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2Icon, UserRoundIcon } from "lucide-react";
import { createEmployerAccount, getWalletProfile } from "@/app/actions/identity";
import { ConnectRequiredCard, useConnectedWalletAddress } from "@/components/auth-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function routeForStatus(status: "new" | "employer" | "employee") {
  if (status === "employer") return "/employer";
  if (status === "employee") return "/employee";
  return null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { address, isConnected } = useConnectedWalletAddress();
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [employeeSelected, setEmployeeSelected] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!address || !isConnected) return;

    startTransition(async () => {
      const profile = await getWalletProfile(address);
      const route = routeForStatus(profile.status);

      if (route) {
        router.replace(route);
      }
    });
  }, [address, isConnected, router]);

  if (!isConnected || !address) {
    return <ConnectRequiredCard />;
  }

  const handleCreateCompany = () => {
    setError(null);

    startTransition(async () => {
      try {
        const profile = await createEmployerAccount({
          walletAddress: address,
          companyName,
        });
        const route = routeForStatus(profile.status);

        router.replace(route ?? "/onboarding");
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Company setup failed";
        setError(message);
      }
    });
  };

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-6">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-3 text-center">
          <Badge variant="secondary" className="mx-auto">
            Connected wallet
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">
            Set up your Allocard workspace
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Create a company account or use an invite link from your company to
            join as an employee.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Building2Icon />
              <CardTitle>Create a company</CardTitle>
              <CardDescription>
                Start as the company owner and manage employee spending
                permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="company-name">Company name</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Acme Labs"
                  maxLength={80}
                />
              </div>
              {error ? (
                <p className="text-sm font-medium text-destructive">{error}</p>
              ) : null}
              <Button
                onClick={handleCreateCompany}
                disabled={isPending || companyName.trim().length < 2}
              >
                {isPending ? "Creating company..." : "Create company"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <UserRoundIcon />
              <CardTitle>Join as an employee</CardTitle>
              <CardDescription>
                Employees join Allocard through an invite link from their
                company.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button
                variant="outline"
                onClick={() => setEmployeeSelected(true)}
              >
                I am an employee
              </Button>
              {employeeSelected ? (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                  Ask your company admin to send you an Allocard invite link.
                  Open that link once with this wallet to join the right company.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
