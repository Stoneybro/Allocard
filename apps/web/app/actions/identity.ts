"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  companies,
  invites,
  users,
} from "@/lib/db/schema";
import {
  generateInviteCode,
  normalizeWalletAddress,
  validateCompanyName,
} from "@/lib/wallet";

type UserRole = "employer" | "employee";

type ProfileUser = {
  id: string;
  role: UserRole;
  walletAddress: string;
  smartAccountAddress: string | null;
  companyId: string | null;
};

type ProfileCompany = {
  id: string;
  name: string;
  ownerId: string;
  smartAccountAddress: string | null;
  inviteCode: string;
};

export type WalletProfile =
  | {
      status: "new";
      user: null;
      company: null;
    }
  | {
      status: "employer" | "employee";
      user: ProfileUser;
      company: ProfileCompany | null;
    };

export type InviteDetails =
  | {
      status: "not_found";
    }
  | {
      status: "expired" | "accepted" | "pending";
      invite: {
        id: string;
        inviteCode: string;
        companyId: string;
        companyName: string;
        acceptedAt: string | null;
      };
    };

function toProfileUser(user: typeof users.$inferSelect): ProfileUser {
  return {
    id: user.id,
    role: user.role,
    walletAddress: user.embeddedWalletAddress,
    smartAccountAddress: user.smartAccountAddress,
    companyId: user.companyId,
  };
}

function toProfileCompany(company: typeof companies.$inferSelect): ProfileCompany {
  return {
    id: company.id,
    name: company.name,
    ownerId: company.ownerId,
    smartAccountAddress: company.smartAccountAddress,
    inviteCode: company.inviteCode,
  };
}

async function getCompanyForUser(user: typeof users.$inferSelect) {
  if (user.role === "employer") {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.ownerId, user.id))
      .limit(1);

    return company ?? null;
  }

  if (!user.companyId) {
    return null;
  }

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, user.companyId))
    .limit(1);

  return company ?? null;
}

export async function getWalletProfile(address: string): Promise<WalletProfile> {
  const walletAddress = normalizeWalletAddress(address);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.embeddedWalletAddress, walletAddress))
    .limit(1);

  if (!user) {
    return {
      status: "new",
      user: null,
      company: null,
    };
  }

  const company = await getCompanyForUser(user);

  return {
    status: user.role,
    user: toProfileUser(user),
    company: company ? toProfileCompany(company) : null,
  };
}

export async function createEmployerAccount(input: {
  walletAddress: string;
  companyName: string;
}) {
  const walletAddress = normalizeWalletAddress(input.walletAddress);
  const companyName = validateCompanyName(input.companyName);
  const existingProfile = await getWalletProfile(walletAddress);

  if (existingProfile.status !== "new") {
    return existingProfile;
  }

  const [user] = await db
    .insert(users)
    .values({
      embeddedWalletAddress: walletAddress,
      role: "employer",
    })
    .returning();

  const [company] = await db
    .insert(companies)
    .values({
      name: companyName,
      ownerId: user.id,
      inviteCode: generateInviteCode(),
    })
    .returning();

  const [updatedUser] = await db
    .update(users)
    .set({ companyId: company.id })
    .where(eq(users.id, user.id))
    .returning();

  return {
    status: "employer",
    user: toProfileUser(updatedUser),
    company: toProfileCompany(company),
  } satisfies WalletProfile;
}

export async function getInviteDetails(
  inviteCode: string,
): Promise<InviteDetails> {
  const [invite] = await db
    .select({
      id: invites.id,
      inviteCode: invites.inviteCode,
      companyId: invites.companyId,
      companyName: companies.name,
      status: invites.status,
      acceptedAt: invites.acceptedAt,
    })
    .from(invites)
    .innerJoin(companies, eq(invites.companyId, companies.id))
    .where(eq(invites.inviteCode, inviteCode))
    .limit(1);

  if (!invite) {
    return { status: "not_found" };
  }

  return {
    status: invite.status,
    invite: {
      id: invite.id,
      inviteCode: invite.inviteCode,
      companyId: invite.companyId,
      companyName: invite.companyName,
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    },
  };
}

export async function acceptInvite(input: {
  walletAddress: string;
  inviteCode: string;
}) {
  const walletAddress = normalizeWalletAddress(input.walletAddress);

  const [invite] = await db
    .select()
    .from(invites)
    .where(eq(invites.inviteCode, input.inviteCode))
    .limit(1);

  if (!invite) {
    throw new Error("Invite not found");
  }

  if (invite.status === "expired") {
    throw new Error("This invite has expired");
  }

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.embeddedWalletAddress, walletAddress))
    .limit(1);

  if (existingUser?.role === "employer") {
    throw new Error("This wallet already owns a company");
  }

  if (existingUser?.role === "employee") {
    if (existingUser.companyId !== invite.companyId) {
      throw new Error("This wallet is already linked to another company");
    }

    if (
      invite.status === "accepted" &&
      invite.acceptedByUserId &&
      invite.acceptedByUserId !== existingUser.id
    ) {
      throw new Error("This invite has already been accepted");
    }

    await db
      .update(invites)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
        acceptedByUserId: existingUser.id,
      })
      .where(eq(invites.id, invite.id));

    return getWalletProfile(walletAddress);
  }

  if (invite.status === "accepted") {
    throw new Error("This invite has already been accepted");
  }

  const [user] = await db
    .insert(users)
    .values({
      embeddedWalletAddress: walletAddress,
      role: "employee",
      companyId: invite.companyId,
    })
    .returning();

  await db
    .update(invites)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      acceptedByUserId: user.id,
    })
    .where(eq(invites.id, invite.id));

  return getWalletProfile(walletAddress);
}

export async function createCompanyInvite(walletAddress: string) {
  const profile = await getWalletProfile(walletAddress);

  if (profile.status !== "employer" || !profile.company) {
    throw new Error("Only a company owner can create employee invites");
  }

  const [invite] = await db
    .insert(invites)
    .values({
      companyId: profile.company.id,
      inviteCode: generateInviteCode(),
    })
    .returning();

  return {
    id: invite.id,
    inviteCode: invite.inviteCode,
    status: invite.status,
  };
}

export async function getCompanyEmployees(walletAddress: string) {
  const profile = await getWalletProfile(walletAddress);

  if (profile.status !== "employer" || !profile.company) {
    throw new Error("Only a company owner can view company employees");
  }

  const employees = await db
    .select({
      id: users.id,
      walletAddress: users.embeddedWalletAddress,
      smartAccountAddress: users.smartAccountAddress,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.companyId, profile.company.id), eq(users.role, "employee")));

  return employees.map((employee) => ({
    ...employee,
    createdAt: employee.createdAt.toISOString(),
  }));
}
