import { requireSession } from "@/lib/auth-guard";
import { getCompanyDashboardState, getWalletProfile } from "@/app/actions/identity";
import { EmployerClient } from "./EmployerClient";

export default async function Page() {
  let initialProfile = null;
  let initialDashboardState = null;

  try {
    const sessionAddr = await requireSession();
    if (sessionAddr) {
      const [profile, dashState] = await Promise.all([
        getWalletProfile(sessionAddr),
        getCompanyDashboardState(sessionAddr),
      ]);
      initialProfile = profile;
      initialDashboardState = dashState;
    }
  } catch {
    // If session is not present or invalid, EmployerClient renders fallback
  }

  return (
    <EmployerClient
      initialProfile={initialProfile}
      initialDashboardState={initialDashboardState}
    />
  );
}
