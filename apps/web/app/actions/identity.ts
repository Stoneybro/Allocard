"use server";

import { and, eq, inArray } from "drizzle-orm";
import { formatEther } from "viem";
import { db } from "@/lib/db";
import {
  agents,
  companies,
  delegationCaveats,
  delegations,
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

type CompanyEmployee = {
  id: string;
  walletAddress: string;
  smartAccountAddress: string | null;
  createdAt: string;
};

type CompanyAgent = {
  id: string;
  name: string;
  smartAccountAddress: string;
  createdAt: string;
};

type CompanyDelegation = {
  id: string;
  parentDelegationId: string | null;
  delegatorType: "company" | "user" | "agent";
  delegatorId: string;
  delegateeType: "user" | "agent" | "eoa";
  delegateeId: string | null;
  delegateeAddress: string | null;
  delegateeLabel: string | null;
  delegationHash: string | null;
  status: "pending_config" | "active" | "revoked";
  canvasPositionX: number;
  canvasPositionY: number;
  createdAt: string;
  activatedAt: string | null;
  revokedAt: string | null;
};

export type CompanyDashboardState = {
  company: ProfileCompany;
  employees: CompanyEmployee[];
  agents: CompanyAgent[];
  delegations: CompanyDelegation[];
  summary: {
    employeeCount: number;
    activeAgentCount: number;
    activeDelegationCount: number;
    delegatedNativeEthAllowance: string;
  };
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

function toCompanyDelegation(
  delegation: typeof delegations.$inferSelect,
): CompanyDelegation {
  return {
    id: delegation.id,
    parentDelegationId: delegation.parentDelegationId,
    delegatorType: delegation.delegatorType,
    delegatorId: delegation.delegatorId,
    delegateeType: delegation.delegateeType,
    delegateeId: delegation.delegateeId,
    delegateeAddress: delegation.delegateeAddress,
    delegateeLabel: delegation.delegateeLabel,
    delegationHash: delegation.delegationHash,
    status: delegation.status,
    canvasPositionX: delegation.canvasPositionX,
    canvasPositionY: delegation.canvasPositionY,
    createdAt: delegation.createdAt.toISOString(),
    activatedAt: delegation.activatedAt?.toISOString() ?? null,
    revokedAt: delegation.revokedAt?.toISOString() ?? null,
  };
}

function extractNativeAllowanceWei(value: unknown): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return BigInt(value);
  }

  if (!value || typeof value !== "object") {
    return 0n;
  }

  const record = value as Record<string, unknown>;
  const amount =
    record.amount ??
    record.maxAmount ??
    record.allowance ??
    record.limit ??
    record.value ??
    record.valueWei;

  return extractNativeAllowanceWei(amount);
}

function formatEthAllowance(wei: bigint) {
  const formatted = formatEther(wei);

  if (!formatted.includes(".")) {
    return formatted;
  }

  return formatted.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
}

async function getCompanyDelegationTree(companyId: string) {
  const rootDelegations = await db
    .select()
    .from(delegations)
    .where(
      and(
        eq(delegations.delegatorType, "company"),
        eq(delegations.delegatorId, companyId),
      ),
    );

  const delegationTree = [...rootDelegations];
  let parentIds = rootDelegations.map((delegation) => delegation.id);

  while (parentIds.length > 0) {
    const childDelegations = await db
      .select()
      .from(delegations)
      .where(inArray(delegations.parentDelegationId, parentIds));

    if (childDelegations.length === 0) {
      break;
    }

    delegationTree.push(...childDelegations);
    parentIds = childDelegations.map((delegation) => delegation.id);
  }

  return delegationTree;
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

export async function getCompanyDashboardState(
  walletAddress: string,
): Promise<CompanyDashboardState> {
  const profile = await getWalletProfile(walletAddress);

  if (profile.status !== "employer" || !profile.company) {
    throw new Error("Only a company owner can view the company dashboard");
  }

  const [companyEmployees, companyAgents, companyDelegations] =
    await Promise.all([
      db
        .select({
          id: users.id,
          walletAddress: users.embeddedWalletAddress,
          smartAccountAddress: users.smartAccountAddress,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(
          and(eq(users.companyId, profile.company.id), eq(users.role, "employee")),
        ),
      db
        .select({
          id: agents.id,
          name: agents.name,
          smartAccountAddress: agents.smartAccountAddress,
          createdAt: agents.createdAt,
        })
        .from(agents)
        .where(eq(agents.companyId, profile.company.id)),
      getCompanyDelegationTree(profile.company.id),
    ]);

  const activeDelegations = companyDelegations.filter(
    (delegation) => delegation.status === "active",
  );
  let delegatedNativeEthAllowanceWei = 0n;

  if (activeDelegations.length > 0) {
    const activeDelegationIds = activeDelegations.map(
      (delegation) => delegation.id,
    );
    const nativeAllowanceCaveats = await db
      .select({
        caveatValue: delegationCaveats.caveatValue,
      })
      .from(delegationCaveats)
      .where(
        and(
          inArray(delegationCaveats.delegationId, activeDelegationIds),
          inArray(delegationCaveats.caveatType, [
            "nativeTokenTransferAmount",
            "nativeTokenPeriodTransfer",
            "valueLte",
          ]),
        ),
      );

    delegatedNativeEthAllowanceWei = nativeAllowanceCaveats.reduce(
      (total, caveat) => total + extractNativeAllowanceWei(caveat.caveatValue),
      0n,
    );
  }

  return {
    company: profile.company,
    employees: companyEmployees.map((employee) => ({
      ...employee,
      createdAt: employee.createdAt.toISOString(),
    })),
    agents: companyAgents.map((agent) => ({
      ...agent,
      createdAt: agent.createdAt.toISOString(),
    })),
    delegations: companyDelegations.map(toCompanyDelegation),
    summary: {
      employeeCount: companyEmployees.length,
      activeAgentCount: companyAgents.length,
      activeDelegationCount: activeDelegations.length,
      delegatedNativeEthAllowance: formatEthAllowance(
        delegatedNativeEthAllowanceWei,
      ),
    },
  };
}
