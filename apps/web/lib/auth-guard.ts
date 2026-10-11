import { getSessionWalletAddress } from "@/lib/session";
import { getSessionIdentity } from "@/lib/session";
import { db } from "@/lib/db";
import { companyMemberships, delegations, employeeProfiles, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Verifies the session cookie and returns the authenticated wallet address.
 * Throws if there is no valid session — use this at the top of every
 * protected API route and server action.
 */
export async function requireSession(): Promise<string> {
  const walletAddress = await getSessionWalletAddress();
  if (!walletAddress) {
    throw new Error("Unauthorized: no valid session. Please sign in.");
  }
  return walletAddress;
}

/** Resolve the verified Privy identity to its Allocard database user. */
export async function requireSessionUser() {
  const identity = await getSessionIdentity();
  if (!identity) throw new Error("Unauthorized: no valid session. Please sign in.");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.privyUserId, identity.providerUserId))
    .limit(1);

  if (!user) throw new Error("Forbidden: create an Allocard profile before continuing.");
  if (user.embeddedWalletAddress.toLowerCase() !== identity.walletAddress.toLowerCase()) {
    throw new Error("Forbidden: session wallet does not match the Allocard profile.");
  }
  return user;
}

/** Ensure the signed-in user has an active employee workspace in the company. */
export async function requireEmployeeCompany(userId: string, companyId: string) {
  const [membership] = await db
    .select({ id: companyMemberships.id })
    .from(companyMemberships)
    .innerJoin(
      employeeProfiles,
      and(
        eq(employeeProfiles.userId, companyMemberships.userId),
        eq(employeeProfiles.companyId, companyMemberships.companyId),
      ),
    )
    .where(and(
      eq(companyMemberships.userId, userId),
      eq(companyMemberships.companyId, companyId),
      eq(companyMemberships.canEmployee, true),
      eq(companyMemberships.status, "active"),
    ))
    .limit(1);

  if (!membership) throw new Error("Forbidden: active employee membership is required.");
}

/** Load an active employee-to-agent delegation and verify its company parent. */
export async function requireEmployeeAgentDelegation(userId: string, delegationId: string) {
  const [delegation] = await db.select().from(delegations)
    .where(eq(delegations.id, delegationId)).limit(1);
  if (
    !delegation || !delegation.signedDelegation || delegation.status !== "active" ||
    delegation.delegatorType !== "user" || delegation.delegatorId !== userId ||
    delegation.delegateeType !== "agent" || !delegation.parentDelegationId
  ) {
    throw new Error("Forbidden: an active delegation for your employee account is required.");
  }

  const [parentDelegation] = await db.select().from(delegations)
    .where(eq(delegations.id, delegation.parentDelegationId)).limit(1);
  if (
    !parentDelegation || !parentDelegation.signedDelegation || parentDelegation.status !== "active" ||
    parentDelegation.delegatorType !== "company" || parentDelegation.delegateeType !== "user" ||
    parentDelegation.delegateeId !== userId
  ) {
    throw new Error("Forbidden: the company delegation for this agent is not active.");
  }

  await requireEmployeeCompany(userId, parentDelegation.delegatorId);
  return { delegation, parentDelegation };
}
