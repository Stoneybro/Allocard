import { getInviteDetails } from "@/app/actions/identity";
import { InviteClient } from "./InviteClient";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const details = await getInviteDetails(inviteCode);

  return <InviteClient details={details} />;
}
