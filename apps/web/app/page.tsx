import { getSessionIdentity } from "@/lib/session";
import { getWalletProfile } from "@/app/actions/identity";
import { LandingPageClient } from "./LandingPageClient";

export default async function Page() {
  let initialWalletAddress: string | null = null;
  let initialProfileStatus: "employer" | "employee" | "picker" | "new" | null = null;

  try {
    const session = await getSessionIdentity();
    if (session?.walletAddress) {
      initialWalletAddress = session.walletAddress;
      const profile = await getWalletProfile(session.walletAddress);
      initialProfileStatus = profile.status;
    }
  } catch {
    // Session expired, invalid, or database unseeded: fallback safely
  }

  return (
    <LandingPageClient
      initialWalletAddress={initialWalletAddress}
      initialProfileStatus={initialProfileStatus}
    />
  );
}
