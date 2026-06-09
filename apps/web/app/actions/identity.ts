"use server";

import { and, eq, inArray } from "drizzle-orm";
import { formatEther, isAddress } from "viem";
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
  signedDelegation: unknown;
  status: "pending_config" | "active" | "revoked";
  canvasPositionX: number;
  canvasPositionY: number;
  caveats: CompanyDelegationCaveat[];
  createdAt: string;
  activatedAt: string | null;
  revokedAt: string | null;
};

type CompanyDelegationCaveat = {
  id: string;
  delegationId: string;
  caveatType:
    | "nativeTokenTransferAmount"
    | "nativeTokenPeriodTransfer"
    | "valueLte"
    | "allowedTargets"
    | "redeemer"
    | "limitedCalls"
    | "custom";
  caveatValue: unknown;
  createdAt: string;
};

type DelegationCaveatInput = {
  maxAmountEth: string;
  period?: "none" | "hourly" | "daily" | "weekly" | "monthly";
  periodAmountEth?: string;
  perTransactionCapEth?: string;
  allowedTargets?: string[];
  redeemers?: string[];
  limitedCalls?: number | null;
  customCaveats?: {
    enforcer: string;
    terms: string;
    args?: string;
  }[];
};

type CaveatRowWithoutDelegationId = Omit<
  typeof delegationCaveats.$inferInsert,
  "delegationId"
>;

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
      status: "employer";
      user: ProfileUser;
      company: ProfileCompany | null;
    }
  | {
      status: "employee";
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

export async function activateSmartAccount(input: {
  walletAddress: string;
  smartAccountAddress: string;
}) {
  const walletAddress = normalizeWalletAddress(input.walletAddress);
  const smartAccountAddress = normalizeWalletAddress(input.smartAccountAddress);
  const profile = await getWalletProfile(walletAddress);

  if (profile.status === "new" || !profile.user) {
    throw new Error("Create an Allocard profile before activating a smart account");
  }

  if (profile.status === "employer") {
    if (!profile.company) {
      throw new Error("Create a company before activating the company account");
    }

    if (
      profile.company.smartAccountAddress &&
      profile.company.smartAccountAddress.toLowerCase() !==
        smartAccountAddress.toLowerCase()
    ) {
      throw new Error("This company already has a different smart account");
    }

    const [company] = await db
      .update(companies)
      .set({ smartAccountAddress })
      .where(eq(companies.id, profile.company.id))
      .returning();

    return {
      target: "company" as const,
      smartAccountAddress: company.smartAccountAddress,
    };
  }

  if (
    profile.user.smartAccountAddress &&
    profile.user.smartAccountAddress.toLowerCase() !==
      smartAccountAddress.toLowerCase()
  ) {
    throw new Error("This employee already has a different smart account");
  }

  const [user] = await db
    .update(users)
    .set({ smartAccountAddress })
    .where(eq(users.id, profile.user.id))
    .returning();

  return {
    target: "user" as const,
    smartAccountAddress: user.smartAccountAddress,
  };
}

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
  caveatsForDelegation: CompanyDelegationCaveat[] = [],
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
    signedDelegation: delegation.signedDelegation,
    status: delegation.status,
    canvasPositionX: delegation.canvasPositionX,
    canvasPositionY: delegation.canvasPositionY,
    caveats: caveatsForDelegation,
    createdAt: delegation.createdAt.toISOString(),
    activatedAt: delegation.activatedAt?.toISOString() ?? null,
    revokedAt: delegation.revokedAt?.toISOString() ?? null,
  };
}

function toCompanyDelegationCaveat(
  caveat: typeof delegationCaveats.$inferSelect,
): CompanyDelegationCaveat {
  return {
    id: caveat.id,
    delegationId: caveat.delegationId,
    caveatType: caveat.caveatType,
    caveatValue: caveat.caveatValue,
    createdAt: caveat.createdAt.toISOString(),
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

const periodDurations = {
  hourly: 60 * 60,
  daily: 60 * 60 * 24,
  weekly: 60 * 60 * 24 * 7,
  monthly: 60 * 60 * 24 * 30,
} as const;

function parsePositiveEthToWei(value: string, fieldName: string) {
  const trimmed = value.trim();

  if (!/^\d+(\.\d{1,18})?$/.test(trimmed)) {
    throw new Error(`${fieldName} must be a positive ETH amount`);
  }

  const [whole, fractional = ""] = trimmed.split(".");
  const wei =
    BigInt(whole) * 1_000_000_000_000_000_000n +
    BigInt((fractional + "0".repeat(18)).slice(0, 18));

  if (wei <= 0n) {
    throw new Error(`${fieldName} must be greater than 0`);
  }

  return wei;
}

function parseOptionalEthToWei(value: string | undefined, fieldName: string) {
  if (!value?.trim()) {
    return null;
  }

  return parsePositiveEthToWei(value, fieldName);
}

function normalizeAddressList(addresses: string[] | undefined, fieldName: string) {
  const normalized = (addresses ?? [])
    .map((address) => address.trim())
    .filter(Boolean)
    .map((address) => normalizeWalletAddress(address));

  for (const address of normalized) {
    if (!isAddress(address)) {
      throw new Error(`${fieldName} includes an invalid address`);
    }
  }

  return Array.from(new Set(normalized));
}

function normalizeHex(value: string, fieldName: string) {
  const normalized = value.trim();

  if (!/^0x([0-9a-fA-F]{2})*$/.test(normalized)) {
    throw new Error(`${fieldName} must be hex bytes`);
  }

  return normalized;
}

function buildCaveatRows(input: DelegationCaveatInput) {
  const maxAmountWei = parsePositiveEthToWei(input.maxAmountEth, "Maximum amount");
  const rows: CaveatRowWithoutDelegationId[] = [
    {
      caveatType: "nativeTokenTransferAmount",
      caveatValue: {
        maxAmount: maxAmountWei.toString(),
        amount: maxAmountWei.toString(),
      },
    },
  ];

  if (input.period && input.period !== "none") {
    const periodAmountWei = parsePositiveEthToWei(
      input.periodAmountEth ?? input.maxAmountEth,
      "Period amount",
    );

    rows.push({
      caveatType: "nativeTokenPeriodTransfer",
      caveatValue: {
        periodAmount: periodAmountWei.toString(),
        amount: periodAmountWei.toString(),
        periodDuration: periodDurations[input.period],
        period: input.period,
        startDate: Math.floor(Date.now() / 1000),
      },
    });
  }

  const perTransactionCapWei = parseOptionalEthToWei(
    input.perTransactionCapEth,
    "Per-transaction cap",
  );

  if (perTransactionCapWei) {
    rows.push({
      caveatType: "valueLte",
      caveatValue: {
        maxValue: perTransactionCapWei.toString(),
        valueWei: perTransactionCapWei.toString(),
      },
    });
  }

  const allowedTargets = normalizeAddressList(
    input.allowedTargets,
    "Allowed targets",
  );

  if (allowedTargets.length > 0) {
    rows.push({
      caveatType: "allowedTargets",
      caveatValue: { targets: allowedTargets },
    });
  }

  const redeemers = normalizeAddressList(input.redeemers, "Redeemers");

  if (redeemers.length > 0) {
    rows.push({
      caveatType: "redeemer",
      caveatValue: { redeemers },
    });
  }

  if (input.limitedCalls !== null && input.limitedCalls !== undefined) {
    if (!Number.isInteger(input.limitedCalls) || input.limitedCalls <= 0) {
      throw new Error("Limited calls must be a positive whole number");
    }

    rows.push({
      caveatType: "limitedCalls",
      caveatValue: { limit: input.limitedCalls },
    });
  }

  for (const customCaveat of input.customCaveats ?? []) {
    if (!customCaveat.enforcer.trim()) continue;

    const enforcer = normalizeWalletAddress(customCaveat.enforcer);
    const terms = normalizeHex(customCaveat.terms, "Custom terms");
    const args = normalizeHex(customCaveat.args || "0x", "Custom args");

    rows.push({
      caveatType: "custom",
      caveatValue: { enforcer, terms, args },
    });
  }

  return rows;
}

type EmployerProfile = Extract<WalletProfile, { status: "employer" }> & {
  company: ProfileCompany;
};

async function getEmployerProfileOrThrow(
  walletAddress: string,
): Promise<EmployerProfile> {
  const profile = await getWalletProfile(walletAddress);

  if (profile.status !== "employer" || !profile.company) {
    throw new Error("Only a company owner can manage delegations");
  }

  return profile as EmployerProfile;
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

async function getEmployerDelegationOrThrow(
  walletAddress: string,
  delegationId: string,
) {
  const profile = await getEmployerProfileOrThrow(walletAddress);
  const [delegation] = await db
    .select()
    .from(delegations)
    .where(
      and(
        eq(delegations.id, delegationId),
        eq(delegations.delegatorType, "company"),
        eq(delegations.delegatorId, profile.company.id),
      ),
    )
    .limit(1);

  if (!delegation) {
    throw new Error("Delegation not found");
  }

  return { profile, delegation };
}

export async function createEmployeeDelegation(input: {
  walletAddress: string;
  employeeId: string;
  canvasPositionX: number;
  canvasPositionY: number;
}) {
  const profile = await getEmployerProfileOrThrow(input.walletAddress);

  const [employee] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, input.employeeId),
        eq(users.role, "employee"),
        eq(users.companyId, profile.company.id),
      ),
    )
    .limit(1);

  if (!employee) {
    throw new Error("Employee not found");
  }

  const [existingDelegation] = await db
    .select()
    .from(delegations)
    .where(
      and(
        eq(delegations.delegatorType, "company"),
        eq(delegations.delegatorId, profile.company.id),
        eq(delegations.delegateeType, "user"),
        eq(delegations.delegateeId, employee.id),
        inArray(delegations.status, ["pending_config", "active"]),
      ),
    )
    .limit(1);

  if (existingDelegation) {
    return getCompanyDashboardState(input.walletAddress);
  }

  await db.insert(delegations).values({
    delegatorType: "company",
    delegatorId: profile.company.id,
    delegateeType: "user",
    delegateeId: employee.id,
    canvasPositionX: input.canvasPositionX,
    canvasPositionY: input.canvasPositionY,
  });

  return getCompanyDashboardState(input.walletAddress);
}

export async function createEoaDelegation(input: {
  walletAddress: string;
  delegateeAddress: string;
  delegateeLabel?: string;
  canvasPositionX: number;
  canvasPositionY: number;
}) {
  const profile = await getEmployerProfileOrThrow(input.walletAddress);
  const delegateeAddress = normalizeWalletAddress(input.delegateeAddress);

  if (!isAddress(delegateeAddress)) {
    throw new Error("Enter a valid EOA address");
  }

  await db.insert(delegations).values({
    delegatorType: "company",
    delegatorId: profile.company.id,
    delegateeType: "eoa",
    delegateeAddress,
    delegateeLabel: input.delegateeLabel?.trim() || null,
    canvasPositionX: input.canvasPositionX,
    canvasPositionY: input.canvasPositionY,
  });

  return getCompanyDashboardState(input.walletAddress);
}

export async function updateDelegationPosition(input: {
  walletAddress: string;
  delegationId: string;
  canvasPositionX: number;
  canvasPositionY: number;
}) {
  await getEmployerDelegationOrThrow(input.walletAddress, input.delegationId);

  await db
    .update(delegations)
    .set({
      canvasPositionX: input.canvasPositionX,
      canvasPositionY: input.canvasPositionY,
    })
    .where(eq(delegations.id, input.delegationId));

  return getCompanyDashboardState(input.walletAddress);
}

export async function saveDelegationCaveats(input: {
  walletAddress: string;
  delegationId: string;
  caveats: DelegationCaveatInput;
}) {
  const { delegation } = await getEmployerDelegationOrThrow(
    input.walletAddress,
    input.delegationId,
  );

  if (delegation.status === "revoked") {
    throw new Error("Revoked delegations cannot be edited");
  }

  const caveatRows = buildCaveatRows(input.caveats);

  await db
    .delete(delegationCaveats)
    .where(eq(delegationCaveats.delegationId, input.delegationId));

  if (caveatRows.length > 0) {
    await db.insert(delegationCaveats).values(
      caveatRows.map((row) => ({
        ...row,
        delegationId: input.delegationId,
      })),
    );
  }

  if (delegation.status === "active") {
    await db
      .update(delegations)
      .set({
        status: "pending_config",
        delegationHash: null,
        signedDelegation: null,
        activatedAt: null,
      })
      .where(eq(delegations.id, input.delegationId));
  }

  return getCompanyDashboardState(input.walletAddress);
}

export async function activateDelegation(input: {
  walletAddress: string;
  delegationId: string;
  delegationHash: string;
  signedDelegation: unknown;
}) {
  const { profile, delegation } = await getEmployerDelegationOrThrow(
    input.walletAddress,
    input.delegationId,
  );

  if (!profile.company.smartAccountAddress) {
    throw new Error("Activate the company smart account first");
  }

  if (delegation.status === "revoked") {
    throw new Error("Revoked delegations cannot be activated");
  }

  const savedCaveats = await db
    .select()
    .from(delegationCaveats)
    .where(eq(delegationCaveats.delegationId, delegation.id));

  if (savedCaveats.length === 0) {
    throw new Error("Configure caveats before activation");
  }

  if (delegation.delegateeType === "user") {
    if (!delegation.delegateeId) {
      throw new Error("Employee delegation is missing its delegatee");
    }

    const [employee] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, delegation.delegateeId),
          eq(users.companyId, profile.company.id),
          eq(users.role, "employee"),
        ),
      )
      .limit(1);

    if (!employee?.smartAccountAddress) {
      throw new Error("The employee smart account must be activated first");
    }
  }

  if (delegation.delegateeType === "eoa" && !delegation.delegateeAddress) {
    throw new Error("EOA delegation is missing its delegatee address");
  }

  await db
    .update(delegations)
    .set({
      delegationHash: input.delegationHash,
      signedDelegation: input.signedDelegation,
      status: "active",
      activatedAt: new Date(),
      revokedAt: null,
    })
    .where(eq(delegations.id, delegation.id));

  return getCompanyDashboardState(input.walletAddress);
}

async function getDescendantDelegationIds(parentIds: string[]) {
  const descendantIds: string[] = [];
  let nextParentIds = parentIds;

  while (nextParentIds.length > 0) {
    const children = await db
      .select({ id: delegations.id })
      .from(delegations)
      .where(inArray(delegations.parentDelegationId, nextParentIds));

    if (children.length === 0) {
      break;
    }

    nextParentIds = children.map((child) => child.id);
    descendantIds.push(...nextParentIds);
  }

  return descendantIds;
}

export async function revokeDelegation(input: {
  walletAddress: string;
  delegationId: string;
}) {
  await getEmployerDelegationOrThrow(input.walletAddress, input.delegationId);

  const descendantIds = await getDescendantDelegationIds([input.delegationId]);
  const idsToRevoke = [input.delegationId, ...descendantIds];
  const revokedAt = new Date();

  await db
    .update(delegations)
    .set({
      status: "revoked",
      revokedAt,
    })
    .where(inArray(delegations.id, idsToRevoke));

  return getCompanyDashboardState(input.walletAddress);
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
  const companyDelegationIds = companyDelegations.map(
    (delegation) => delegation.id,
  );
  const companyCaveats =
    companyDelegationIds.length > 0
      ? await db
          .select()
          .from(delegationCaveats)
          .where(inArray(delegationCaveats.delegationId, companyDelegationIds))
      : [];
  const caveatsByDelegationId = new Map<string, CompanyDelegationCaveat[]>();

  for (const caveat of companyCaveats.map(toCompanyDelegationCaveat)) {
    const existing = caveatsByDelegationId.get(caveat.delegationId) ?? [];
    existing.push(caveat);
    caveatsByDelegationId.set(caveat.delegationId, existing);
  }

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
    delegations: companyDelegations.map((delegation) =>
      toCompanyDelegation(
        delegation,
        caveatsByDelegationId.get(delegation.id) ?? [],
      ),
    ),
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
