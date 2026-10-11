"use server";

import { db } from "@/lib/db";
import { manualTransactions, agentBookings, claimRedemptions, users, agents, companyMemberships, employeeProfiles } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getSessionIdentity } from "@/lib/session";

export type ActivityLogItem = {
  id: string;
  date: string;
  actor: string; // "Employee (0x...)" or "Agent (Name)"
  type: string; // "Direct Spend", "Travel Booking", "Procurement", "Reimbursement"
  amountEth: string;
  purpose: string;
  status: string;
  txHash?: string | null;
};

export async function getActivityLog(companyId: string): Promise<ActivityLogItem[]> {
  const identity = await getSessionIdentity();
  if (!identity) throw new Error("Sign in again to continue");
  const [user] = await db.select().from(users).where(eq(users.privyUserId, identity.providerUserId)).limit(1);
  if (!user) throw new Error("Create an Allocard profile before viewing activity");
  const [employerMembership] = await db.select().from(companyMemberships).where(and(
    eq(companyMemberships.userId, user.id),
    eq(companyMemberships.companyId, companyId),
    eq(companyMemberships.canEmployer, true),
    eq(companyMemberships.status, "active"),
  )).limit(1);
  if (!employerMembership) throw new Error("Employer access is required to view this company's activity");

  const [manual, bookings, claims, allEmployees, allAgents] = await Promise.all([
    db.select().from(manualTransactions).where(eq(manualTransactions.companyId, companyId)),
    db.select().from(agentBookings).where(eq(agentBookings.companyId, companyId)),
    db.select().from(claimRedemptions).where(eq(claimRedemptions.companyId, companyId)),
    db.select({ id: users.id, embeddedWalletAddress: users.embeddedWalletAddress })
      .from(companyMemberships)
      .innerJoin(users, eq(companyMemberships.userId, users.id))
      .innerJoin(employeeProfiles, and(eq(employeeProfiles.userId, users.id), eq(employeeProfiles.companyId, companyId)))
      .where(and(eq(companyMemberships.companyId, companyId), eq(companyMemberships.canEmployee, true), eq(companyMemberships.status, "active"))),
    db.select().from(agents),
  ]);

  const userMap = new Map(allEmployees.map((u) => [u.id, `Employee (${u.embeddedWalletAddress.slice(0, 6)}...${u.embeddedWalletAddress.slice(-4)})`]));
  const agentMap = new Map(allAgents.map((a) => [a.id, `Agent (${a.name})`]));

  const log: ActivityLogItem[] = [];

  for (const m of manual) {
    const actor = userMap.get(m.employeeId) || "Unknown Employee";
    let status = m.isFlagged ? "Flagged" : "Compliant";
    if (m.receiptSummary) {
      status += ` | ${m.receiptSummary}`;
    }
    log.push({
      id: `manual_${m.id}`,
      date: m.createdAt.toISOString(),
      actor,
      type: "Direct Spend",
      amountEth: m.amountEth || "0",
      purpose: m.purpose,
      status,
      txHash: m.txHash,
    });
  }

  for (const b of bookings) {
    const actor = agentMap.get(b.agentId) || "Unknown Agent";
    const details = b.bookingDetails as Record<string, unknown>;
    const type = details.flightOption ? "Travel Booking" : "Procurement";
    
    log.push({
      id: `booking_${b.id}`,
      date: b.createdAt.toISOString(),
      actor,
      type,
      amountEth: b.amountEth || "0",
      purpose: (details.prompt as string) || "Agent Booking",
      status: "Executed",
      txHash: b.txHash,
    });
  }

  for (const c of claims) {
    const actor = c.agentId ? agentMap.get(c.agentId) || "Unknown Agent" : "System";
    log.push({
      id: `claim_${c.id}`,
      date: c.createdAt.toISOString(),
      actor,
      type: "Reimbursement",
      amountEth: c.amountEth,
      purpose: c.claimDescription,
      status: c.status.charAt(0).toUpperCase() + c.status.slice(1),
      txHash: c.txHash,
    });
  }

  // Sort by date descending
  return log.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
