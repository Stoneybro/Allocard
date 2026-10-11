import { requireSession } from "@/lib/auth-guard";
import { getEmployeeDashboardState, getWalletProfile } from "@/app/actions/identity";
import { EmployeeClient } from "./EmployeeClient";

export default async function Page() {
  let initialProfile = null;
  let initialDashboardState = null;

  try {
    const sessionAddr = await requireSession();
    if (sessionAddr) {
      const [profile, dashState] = await Promise.all([
        getWalletProfile(sessionAddr),
        getEmployeeDashboardState(sessionAddr),
      ]);
      initialProfile = profile;
      initialDashboardState = dashState;
    }
  } catch {
    // If session is not present or invalid, EmployeeClient renders fallback
  }

  return (
    <EmployeeClient
      initialProfile={initialProfile}
      initialDashboardState={initialDashboardState}
    />
  );
}
