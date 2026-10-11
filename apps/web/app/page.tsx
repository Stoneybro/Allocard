import { getSessionIdentity } from "@/lib/session";
import { getWalletProfile } from "@/app/actions/identity";
import { redirect } from "next/navigation";
import { LandingPageClient } from "./LandingPageClient";

export default async function Page() {
  const session = await getSessionIdentity();
  if (session?.walletAddress) {
    try {
      const profile = await getWalletProfile(session.walletAddress);
      if (profile.status === "employer") redirect("/employer");
      if (profile.status === "employee") redirect("/employee");
      if (profile.status === "picker") redirect("/workspaces");
      if (profile.status === "new") redirect("/onboarding");
    } catch {
      // Session expired, invalid, or database empty: fallback to landing page
    }
  }

  return <LandingPageClient />;
}
