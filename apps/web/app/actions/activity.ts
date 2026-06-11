"use server";

import { db } from "@/lib/db";
import { manualTransactions, agentBookings, claimRedemptions, users, agents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

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
  const [manual, bookings, claims, allUsers, allAgents] = await Promise.all([
    db.select().from(manualTransactions).where(eq(manualTransactions.companyId, companyId)),
    db.select().from(agentBookings).where(eq(agentBookings.companyId, companyId)),
    db.select().from(claimRedemptions).where(eq(claimRedemptions.companyId, companyId)),
    db.select().from(users).where(eq(users.companyId, companyId)),
    db.select().from(agents),
  ]);

  const userMap = new Map(allUsers.map((u) => [u.id, `Employee (${u.embeddedWalletAddress.slice(0, 6)}...${u.embeddedWalletAddress.slice(-4)})`]));
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
