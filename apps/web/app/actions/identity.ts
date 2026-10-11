"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { formatEther, isAddress, parseEther } from "viem";
import { db } from "@/lib/db";
import {
  agentBookings,
  agents,
  claimRedemptions,
  companies,
  delegationCaveats,
  delegations,
  companyMemberships,
  employeeProfiles,
  manualTransactions,
  pendingEmployees,
  workspacePreferences,
  users,
} from "@/lib/db/schema";
import {
  normalizeWalletAddress,
  validateCompanyName,
} from "@/lib/wallet";
import { withRetry } from "@/lib/db/withRetry";
import { requireSession } from "@/lib/auth-guard";
import { getSessionIdentity } from "@/lib/session";


// ── Module-level caches (serverless-safe: each cold start resets) ───────────

type CacheEntry<T> = { data: T; expiresAt: number };

let _agentCache: CacheEntry<PlatformAgent[]> | null = null;
const AGENT_CACHE_TTL_MS = 60_000; // 60s — agents rarely change


// ── Session validation helper ────────────────────────────────────────────────

async function validateSessionWallet(walletAddress: string): Promise<string> {
  const sessionAddr = await requireSession();
  const normalizedSession = sessionAddr.toLowerCase();
  const normalizedInput = walletAddress.toLowerCase();
  if (normalizedSession !== normalizedInput) {
    throw new Error("Session wallet does not match the requested wallet address.");
  }
  return normalizedSession;
}

function getCachedAgents(): PlatformAgent[] | null {
  if (_agentCache && Date.now() < _agentCache.expiresAt) {
    return _agentCache.data;
  }
  return null;
}

function setCachedAgents(agents: PlatformAgent[]) {
  _agentCache = { data: agents, expiresAt: Date.now() + AGENT_CACHE_TTL_MS };
}

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
  companyPolicy: string | null;
};

type CompanyEmployee = {
  id: string;
  walletAddress: string;
  smartAccountAddress: string | null;
  createdAt: string;
};

type PlatformAgent = {
  id: string;
  name: string;
  description: string | null;
  smartAccountAddress: string;
  signerAddress: string;
  isActive: boolean;
  createdAt: string;
};

/** @deprecated Use PlatformAgent. Kept for CompanyDashboardState compat. */
type CompanyAgent = PlatformAgent;

type CompanyDelegation = {
  id: string;
  parentDelegationId: string | null;
  delegatorType: "company" | "user" | "agent";
  delegatorId: string;
  delegateeType: "user" | "agent";
  delegateeId: string | null;
  delegationHash: string | null;
  signedDelegation: unknown;
  policyPrompt: string | null;
  status: "pending_config" | "active" | "revoked";
  canvasPositionX: number;
  canvasPositionY: number;
  caveats: CompanyDelegationCaveat[];
  createdAt: string;
  activatedAt: string | null;
  revokedAt: string | null;
  remainingEth?: string;
};

export type CompanyDelegationCaveat = {
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
  pendingEmployees: { id: string; email: string; createdAt: string }[];
  /** All active platform agents — same catalog regardless of company. */
  agents: PlatformAgent[];
  delegations: CompanyDelegation[];
  /** Company-wide expense policy — the single source of truth for Venice AI checks. */
  companyPolicy: string | null;
  summary: {
    employeeCount: number;
    /** Number of active company → agent delegations (not total agent count). */
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
      status: "picker";
      user: ProfileUser;
      company: null;
      workspaces: WorkspaceOption[];
    }
  | {
      status: "employer";
      user: ProfileUser;
      company: ProfileCompany | null;
      workspaces?: WorkspaceOption[];
    }
  | {
      status: "employee";
      user: ProfileUser;
      company: ProfileCompany | null;
      workspaces?: WorkspaceOption[];
    };

export type WorkspaceOption = {
  companyId: string;
  companyName: string;
  canEmployer: boolean;
  canEmployee: boolean;
};

export async function activateSmartAccount(input: {
  walletAddress: string;
  smartAccountAddress: string;
}) {
  const walletAddress = normalizeWalletAddress(input.walletAddress);
  await validateSessionWallet(walletAddress);
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

  if (!profile.user.companyId) throw new Error("Select an employee company before activating its account");
  const [user] = await db
    .update(employeeProfiles)
    .set({ smartAccountAddress })
    .where(and(
      eq(employeeProfiles.userId, profile.user.id),
      eq(employeeProfiles.companyId, profile.user.companyId),
    ))
    .returning();

  return {
    target: "user" as const,
    smartAccountAddress: user.smartAccountAddress,
  };
}

function toProfileUser(
  user: typeof users.$inferSelect,
  role: UserRole = user.role,
  companyId: string | null = user.companyId,
  smartAccountAddress: string | null = user.smartAccountAddress,
): ProfileUser {
  return {
    id: user.id,
    role,
    walletAddress: user.embeddedWalletAddress,
    smartAccountAddress,
    companyId,
  };
}

function toProfileCompany(company: typeof companies.$inferSelect): ProfileCompany {
  return {
    id: company.id,
    name: company.name,
    ownerId: company.ownerId,
    smartAccountAddress: company.smartAccountAddress,
    companyPolicy: company.companyPolicy ?? null,
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
    delegationHash: delegation.delegationHash,
    signedDelegation: delegation.signedDelegation,
    policyPrompt: delegation.policyPrompt,
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
  const rootDelegations = await withRetry(
    () =>
      db
        .select()
        .from(delegations)
        .where(
          and(
            eq(delegations.delegatorType, "company"),
            eq(delegations.delegatorId, companyId),
          ),
        ),
    "getCompanyDelegationTree:root"
  );

  const delegationTree = [...rootDelegations];
  let parentIds = rootDelegations.map((delegation) => delegation.id);

  while (parentIds.length > 0) {
    const childDelegations = await withRetry(
      () =>
        db
          .select()
          .from(delegations)
          .where(inArray(delegations.parentDelegationId, parentIds)),
      "getCompanyDelegationTree:children"
    );

    if (childDelegations.length === 0) {
      break;
    }

    delegationTree.push(...childDelegations);
    parentIds = childDelegations.map((delegation) => delegation.id);
  }

  return delegationTree;
}

export async function getWalletProfile(address: string): Promise<WalletProfile> {
  const walletAddress = normalizeWalletAddress(address);
  await validateSessionWallet(walletAddress);
  const identity = await getSessionIdentity();
  if (!identity) throw new Error("Sign in again to continue");

  let [user] = await withRetry(() => db.select().from(users)
    .where(eq(users.privyUserId, identity.providerUserId)).limit(1), "getWalletProfile:privy-user");

  if (!user) {
    [user] = await withRetry(() => db.select().from(users)
      .where(eq(users.embeddedWalletAddress, walletAddress)).limit(1), "getWalletProfile:wallet-user");
    if (user && user.privyUserId && user.privyUserId !== identity.providerUserId) {
      throw new Error("This signing wallet is linked to a different account. Complete verified account linking before continuing.");
    }
    if (user && !user.privyUserId) {
      [user] = await db.update(users).set({
        privyUserId: identity.providerUserId,
        verifiedEmail: identity.email,
      }).where(eq(users.id, user.id)).returning();
    }
  }

  if (user && user.embeddedWalletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error("This account is linked to a different signing wallet. Complete verified account linking before continuing.");
  }

  if (!user) {
    const result: WalletProfile = { status: "new", user: null, company: null };
    return result;
  }

  const memberships = await withRetry(() => db.select({
    membership: companyMemberships,
    company: companies,
  }).from(companyMemberships).innerJoin(companies, eq(companyMemberships.companyId, companies.id))
    .where(and(eq(companyMemberships.userId, user.id), eq(companyMemberships.status, "active"))),
  "getWalletProfile:memberships");

  if (memberships.length === 0) {
    const result: WalletProfile = { status: "new", user: null, company: null };
    return result;
  }

  const [preference] = await db.select().from(workspacePreferences)
    .where(eq(workspacePreferences.userId, user.id)).limit(1);
  const selected = memberships.find(({ membership }) => membership.companyId === preference?.companyId);

  if (!selected && memberships.length > 1) {
    const result: WalletProfile = {
      status: "picker",
      user: toProfileUser(user),
      company: null,
      workspaces: memberships.map(({ membership, company }) => ({
        companyId: company.id,
        companyName: company.name,
        canEmployer: membership.canEmployer,
        canEmployee: membership.canEmployee,
      })),
    };
    return result;
  }

  const chosen = selected ?? memberships[0];
  const preferredRole = preference?.companyId === chosen.company.id ? preference.role : null;
  const role: UserRole = preferredRole === "employer" && chosen.membership.canEmployer
    ? "employer"
    : preferredRole === "employee" && chosen.membership.canEmployee
      ? "employee"
      : chosen.membership.canEmployer ? "employer" : "employee";

  const [employeeProfile] = role === "employee"
    ? await db.select().from(employeeProfiles).where(and(
        eq(employeeProfiles.companyId, chosen.company.id),
        eq(employeeProfiles.userId, user.id),
      )).limit(1)
    : [];

  const currentUser = toProfileUser(
    user,
    role,
    chosen.company.id,
    role === "employee" ? employeeProfile?.smartAccountAddress ?? user.smartAccountAddress : null,
  );
  const result: WalletProfile = {
    status: role,
    user: currentUser,
    company: toProfileCompany(chosen.company),
    workspaces: memberships.map(({ membership, company }) => ({
      companyId: company.id,
      companyName: company.name,
      canEmployer: membership.canEmployer,
      canEmployee: membership.canEmployee,
    })),
  };
  return result;
}

export async function createEmployerAccount(input: { walletAddress: string; companyName: string }) {
  const walletAddress = normalizeWalletAddress(input.walletAddress);
  await validateSessionWallet(walletAddress);
  const identity = await getSessionIdentity();
  if (!identity) throw new Error("Sign in again to continue");
  const companyName = validateCompanyName(input.companyName);

  let [user] = await db.select().from(users).where(eq(users.privyUserId, identity.providerUserId)).limit(1);
  if (!user) user = (await db.select().from(users).where(eq(users.embeddedWalletAddress, walletAddress)).limit(1))[0];
  if (user && user.embeddedWalletAddress.toLowerCase() !== walletAddress) {
    throw new Error("This account is linked to a different signing wallet. Complete verified account linking before continuing.");
  }
  if (user?.privyUserId && user.privyUserId !== identity.providerUserId) {
    throw new Error("This signing wallet is linked to a different account. Complete verified account linking before continuing.");
  }
  if (!user) {
    [user] = await db.insert(users).values({
      privyUserId: identity.providerUserId,
      verifiedEmail: identity.email,
      embeddedWalletAddress: walletAddress,
      role: "employer",
    }).returning();
  } else if (!user.privyUserId) {
    [user] = await db.update(users).set({ privyUserId: identity.providerUserId, verifiedEmail: identity.email })
      .where(eq(users.id, user.id)).returning();
  }

  const [company] = await db.insert(companies).values({ name: companyName, ownerId: user.id }).returning();
  if (!user.companyId) {
    await db.update(users).set({ companyId: company.id, role: "employer" }).where(eq(users.id, user.id));
  }
  await db.insert(companyMemberships).values({ userId: user.id, companyId: company.id, canEmployer: true })
    .onConflictDoUpdate({
      target: [companyMemberships.companyId, companyMemberships.userId],
      set: { canEmployer: true, status: "active", removedAt: null },
    });
  await db.insert(workspacePreferences).values({ userId: user.id, companyId: company.id, role: "employer" })
    .onConflictDoUpdate({ target: workspacePreferences.userId, set: { companyId: company.id, role: "employer", updatedAt: new Date() } });
  return getWalletProfile(walletAddress);
}

function normalizeVerifiedEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Enter a valid email address");
  }
  return normalized;
}

export async function getPendingCompanyMemberships() {
  const identity = await getSessionIdentity();
  if (!identity) throw new Error("Sign in again to continue");
  const normalizedEmail = normalizeVerifiedEmail(identity.email);
  const rows = await db.select({
    id: pendingEmployees.id,
    companyId: companies.id,
    companyName: companies.name,
    createdAt: pendingEmployees.createdAt,
  }).from(pendingEmployees).innerJoin(companies, eq(pendingEmployees.companyId, companies.id))
    .where(and(
      eq(pendingEmployees.normalizedEmail, normalizedEmail),
      eq(pendingEmployees.status, "pending"),
    ));
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export async function addSelfAsEmployee(walletAddress: string) {
  const normalizedAddress = normalizeWalletAddress(walletAddress);
  await validateSessionWallet(normalizedAddress);
  const profile = await getWalletProfile(normalizedAddress);
  if (profile.status !== "employer" || !profile.user.companyId) {
    throw new Error("Switch to the employer workspace before adding yourself");
  }
  const companyId = profile.user.companyId;
  const [membership] = await db.select().from(companyMemberships).where(and(
    eq(companyMemberships.userId, profile.user.id),
    eq(companyMemberships.companyId, companyId),
    eq(companyMemberships.status, "active"),
  )).limit(1);
  if (!membership?.canEmployer) throw new Error("Employer access is required");

  await db.insert(companyMemberships).values({
    userId: profile.user.id,
    companyId,
    canEmployee: true,
  }).onConflictDoUpdate({
    target: [companyMemberships.companyId, companyMemberships.userId],
    set: { canEmployee: true, status: "active", removedAt: null },
  });
  await db.insert(employeeProfiles).values({ companyId, userId: profile.user.id })
    .onConflictDoNothing({ target: [employeeProfiles.companyId, employeeProfiles.userId] });
  await db.insert(workspacePreferences).values({ userId: profile.user.id, companyId, role: "employee" })
    .onConflictDoUpdate({ target: workspacePreferences.userId, set: { companyId, role: "employee", updatedAt: new Date() } });
  return getWalletProfile(normalizedAddress);
}

export async function addEmployeeByEmail(input: { walletAddress: string; email: string }) {
  const normalizedAddress = normalizeWalletAddress(input.walletAddress);
  await validateSessionWallet(normalizedAddress);
  const profile = await getWalletProfile(normalizedAddress);
  if (profile.status !== "employer" || !profile.company) throw new Error("Employer access is required");
  const email = normalizeVerifiedEmail(input.email);
  const identity = await getSessionIdentity();
  if (identity && email === normalizeVerifiedEmail(identity.email)) {
    return { status: "self_added" as const, profile: await addSelfAsEmployee(normalizedAddress) };
  }

  const [existing] = await db.select().from(pendingEmployees).where(and(
    eq(pendingEmployees.companyId, profile.company.id),
    eq(pendingEmployees.normalizedEmail, email),
  )).limit(1);
  if (existing?.status === "accepted") return { status: "already_active" as const };
  if (existing?.status === "pending") return { status: "already_pending" as const };

  await db.insert(pendingEmployees).values({
    companyId: profile.company.id,
    email,
    normalizedEmail: email,
  }).onConflictDoUpdate({
    target: [pendingEmployees.companyId, pendingEmployees.normalizedEmail],
    set: { email, status: "pending", acceptedByUserId: null, acceptedAt: null },
  });
  return { status: "pending" as const };
}

export async function acceptEmployeeMembership(input: { walletAddress: string; companyId: string }) {
  const normalizedAddress = normalizeWalletAddress(input.walletAddress);
  await validateSessionWallet(normalizedAddress);
  const identity = await getSessionIdentity();
  if (!identity) throw new Error("Sign in again to continue");
  const normalizedEmail = normalizeVerifiedEmail(identity.email);
  const [pending] = await db.select().from(pendingEmployees).where(and(
    eq(pendingEmployees.companyId, input.companyId),
    eq(pendingEmployees.normalizedEmail, normalizedEmail),
  )).limit(1);
  if (!pending || (pending.status !== "pending" && pending.status !== "accepted")) {
    throw new Error("No pending company access was found for this verified email");
  }

  let [user] = await db.select().from(users).where(eq(users.privyUserId, identity.providerUserId)).limit(1);
  if (!user) {
    [user] = await db.select().from(users).where(eq(users.embeddedWalletAddress, normalizedAddress)).limit(1);
  }
  if (!user) {
    const [created] = await db.insert(users).values({
      privyUserId: identity.providerUserId,
      verifiedEmail: normalizedEmail,
      embeddedWalletAddress: normalizedAddress,
      role: "employee",
      companyId: pending.companyId,
    }).onConflictDoNothing().returning();
    user = created ?? (await db.select().from(users).where(eq(users.privyUserId, identity.providerUserId)).limit(1))[0];
  }
  if (!user) throw new Error("Could not create your Allocard profile. Please retry");
  if (user.embeddedWalletAddress.toLowerCase() !== normalizedAddress) {
    throw new Error("This account is linked to a different signing wallet. Complete verified account linking before continuing.");
  }
  if (user.privyUserId && user.privyUserId !== identity.providerUserId) {
    throw new Error("This signing wallet is linked to a different account. Complete verified account linking before continuing.");
  }
  if (pending.status === "accepted" && pending.acceptedByUserId && pending.acceptedByUserId !== user.id) {
    throw new Error("This company membership has already been accepted by another account");
  }
  if (!user.privyUserId) {
    [user] = await db.update(users).set({ privyUserId: identity.providerUserId, verifiedEmail: normalizedEmail })
      .where(eq(users.id, user.id)).returning();
  }

  if (pending.status === "pending") {
    const [claimed] = await db.update(pendingEmployees).set({
      status: "accepted",
      acceptedByUserId: user.id,
      acceptedAt: new Date(),
    }).where(and(
      eq(pendingEmployees.id, pending.id),
      eq(pendingEmployees.status, "pending"),
    )).returning();
    if (!claimed) {
      const [latest] = await db.select().from(pendingEmployees).where(eq(pendingEmployees.id, pending.id)).limit(1);
      if (latest?.acceptedByUserId !== user.id) throw new Error("This company membership has already been accepted by another account");
    }
  }

  await db.insert(companyMemberships).values({ userId: user.id, companyId: pending.companyId, canEmployee: true })
    .onConflictDoUpdate({
      target: [companyMemberships.companyId, companyMemberships.userId],
      set: { canEmployee: true, status: "active", removedAt: null },
    });
  await db.insert(employeeProfiles).values({ companyId: pending.companyId, userId: user.id })
    .onConflictDoNothing({ target: [employeeProfiles.companyId, employeeProfiles.userId] });
  await db.insert(workspacePreferences).values({ userId: user.id, companyId: pending.companyId, role: "employee" })
    .onConflictDoUpdate({ target: workspacePreferences.userId, set: { companyId: pending.companyId, role: "employee", updatedAt: new Date() } });
  return getWalletProfile(normalizedAddress);
}

export async function getWorkspaceOptions(walletAddress: string) {
  const normalizedAddress = normalizeWalletAddress(walletAddress);
  await validateSessionWallet(normalizedAddress);
  const identity = await getSessionIdentity();
  if (!identity) throw new Error("Sign in again to continue");
  await getWalletProfile(normalizedAddress);
  const [user] = await db.select().from(users).where(eq(users.privyUserId, identity.providerUserId)).limit(1);
  const memberships = user ? await db.select({
    companyId: companies.id,
    companyName: companies.name,
    canEmployer: companyMemberships.canEmployer,
    canEmployee: companyMemberships.canEmployee,
  }).from(companyMemberships).innerJoin(companies, eq(companyMemberships.companyId, companies.id))
    .where(and(
      eq(companyMemberships.userId, user.id),
      eq(companyMemberships.status, "active"),
    )) : [];
  const pending = await getPendingCompanyMemberships();
  return { memberships, pending };
}

export async function setWorkspaceContext(input: { walletAddress: string; companyId: string; role: UserRole }) {
  const normalizedAddress = normalizeWalletAddress(input.walletAddress);
  await validateSessionWallet(normalizedAddress);
  const profile = await getWalletProfile(normalizedAddress);
  if (!profile.user) throw new Error("Create an Allocard profile first");
  const [membership] = await db.select().from(companyMemberships).where(and(
    eq(companyMemberships.userId, profile.user.id),
    eq(companyMemberships.companyId, input.companyId),
    eq(companyMemberships.status, "active"),
  )).limit(1);
  if (!membership || (input.role === "employer" ? !membership.canEmployer : !membership.canEmployee)) {
    throw new Error("You do not have that role in this company");
  }
  await db.insert(workspacePreferences).values({ userId: profile.user.id, companyId: input.companyId, role: input.role })
    .onConflictDoUpdate({ target: workspacePreferences.userId, set: { companyId: input.companyId, role: input.role, updatedAt: new Date() } });
  return getWalletProfile(normalizedAddress);
}

export async function getCompanyEmployees(walletAddress: string) {
  const profile = await getWalletProfile(walletAddress);
  if (profile.status !== "employer" || !profile.company) throw new Error("Employer access is required");

  const employees = await db.select({
    id: users.id,
    walletAddress: users.embeddedWalletAddress,
    smartAccountAddress: employeeProfiles.smartAccountAddress,
    createdAt: employeeProfiles.createdAt,
  }).from(companyMemberships)
    .innerJoin(users, eq(companyMemberships.userId, users.id))
    .innerJoin(employeeProfiles, and(
      eq(employeeProfiles.userId, users.id),
      eq(employeeProfiles.companyId, profile.company.id),
    ))
    .where(and(
      eq(companyMemberships.companyId, profile.company.id),
      eq(companyMemberships.canEmployee, true),
      eq(companyMemberships.status, "active"),
    ));

  return employees.map((employee) => ({ ...employee, createdAt: employee.createdAt.toISOString() }));
}

async function getEmployerDelegationOrThrow(
  walletAddress: string,
  delegationId: string,
) {
  const profile = await getEmployerProfileOrThrow(walletAddress);
  await validateSessionWallet(walletAddress);
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
  await validateSessionWallet(input.walletAddress);

  const [employee] = await db
    .select({
      id: users.id,
      embeddedWalletAddress: users.embeddedWalletAddress,
      smartAccountAddress: employeeProfiles.smartAccountAddress,
    })
    .from(companyMemberships)
    .innerJoin(users, eq(companyMemberships.userId, users.id))
    .innerJoin(employeeProfiles, and(
      eq(employeeProfiles.userId, users.id),
      eq(employeeProfiles.companyId, profile.company.id),
    ))
    .where(
      and(
        eq(companyMemberships.userId, input.employeeId),
        eq(companyMemberships.companyId, profile.company.id),
        eq(companyMemberships.canEmployee, true),
        eq(companyMemberships.status, "active"),
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

// ---------------------------------------------------------------------------
// createAgentDelegation — company → platform agent (employer canvas)
// ---------------------------------------------------------------------------

export async function createAgentDelegation(input: {
  walletAddress: string;
  agentId: string;
  canvasPositionX: number;
  canvasPositionY: number;
}): Promise<CompanyDashboardState> {
  const profile = await getEmployerProfileOrThrow(input.walletAddress);
  await validateSessionWallet(input.walletAddress);

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, input.agentId), eq(agents.isActive, true)))
    .limit(1);

  if (!agent) {
    throw new Error("Agent not found or is inactive");
  }

  // Prevent duplicate active/pending-config delegations to the same agent.
  const [existingDelegation] = await db
    .select()
    .from(delegations)
    .where(
      and(
        eq(delegations.delegatorType, "company"),
        eq(delegations.delegatorId, profile.company.id),
        eq(delegations.delegateeType, "agent"),
        eq(delegations.delegateeId, agent.id),
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
    delegateeType: "agent",
    delegateeId: agent.id,
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
  await validateSessionWallet(input.walletAddress);
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
  policyPrompt?: string;
}) {
  await validateSessionWallet(input.walletAddress);
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

  const updatePayload: any = {
    policyPrompt: input.policyPrompt ?? null,
  };

  if (delegation.status === "active") {
    updatePayload.status = "pending_config";
    updatePayload.delegationHash = null;
    updatePayload.signedDelegation = null;
    updatePayload.activatedAt = null;
  }

  await db
    .update(delegations)
    .set(updatePayload)
    .where(eq(delegations.id, input.delegationId));

  return getCompanyDashboardState(input.walletAddress);
}

export async function activateDelegation(input: {
  walletAddress: string;
  delegationId: string;
  delegationHash: string;
  signedDelegation: unknown;
}) {
  await validateSessionWallet(input.walletAddress);
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
      .select({ smartAccountAddress: employeeProfiles.smartAccountAddress })
      .from(companyMemberships)
      .innerJoin(users, eq(companyMemberships.userId, users.id))
      .innerJoin(employeeProfiles, and(
        eq(employeeProfiles.userId, users.id),
        eq(employeeProfiles.companyId, profile.company.id),
      ))
      .where(
        and(
          eq(companyMemberships.userId, delegation.delegateeId),
          eq(companyMemberships.companyId, profile.company.id),
          eq(companyMemberships.canEmployee, true),
          eq(companyMemberships.status, "active"),
        ),
      )
      .limit(1);

    if (!employee?.smartAccountAddress) {
      throw new Error("The employee smart account must be activated first");
    }
  }

  if (delegation.delegateeType === "agent") {
    if (!delegation.delegateeId) {
      throw new Error("Agent delegation is missing its delegatee");
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, delegation.delegateeId))
      .limit(1);

    if (!agent?.smartAccountAddress) {
      throw new Error("The agent does not have a smart account configured yet");
    }

    // Reject placeholder addresses — real addresses are set during Piece 3-5 deployment.
    if (agent.smartAccountAddress.startsWith("0x000000000000000000000000000000000000000")) {
      throw new Error(
        `${agent.name} smart account has not been deployed yet. Complete the agent deployment setup first.`,
      );
    }
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
  await validateSessionWallet(input.walletAddress);
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

export async function removePendingDelegation(input: {
  walletAddress: string;
  delegationId: string;
}) {
  await validateSessionWallet(input.walletAddress);
  const { delegation } = await getEmployerDelegationOrThrow(
    input.walletAddress,
    input.delegationId,
  );

  if (delegation.status !== "pending_config" && delegation.status !== "revoked") {
    throw new Error("Only pending or revoked delegations can be removed");
  }

  const descendants = await getDescendantDelegationIds([delegation.id]);
  const idsToDelete = [delegation.id, ...descendants];

  await db.delete(delegations).where(inArray(delegations.id, idsToDelete));

  return getCompanyDashboardState(input.walletAddress);
}

// ---------------------------------------------------------------------------
// Company policy editor
// ---------------------------------------------------------------------------


export async function updateCompanyPolicy(input: {
  walletAddress: string;
  companyPolicy: string;
}): Promise<CompanyDashboardState> {
  await validateSessionWallet(input.walletAddress);
  const profile = await getWalletProfile(input.walletAddress);
  if (profile.status !== "employer" || !profile.company) {
    throw new Error("Only a company owner can update company policy");
  }

  await db
    .update(companies)
    .set({ companyPolicy: input.companyPolicy })
    .where(eq(companies.id, profile.company.id));

  return getCompanyDashboardState(input.walletAddress);
}

export async function getCompanyDashboardState(
  walletAddress: string,
): Promise<CompanyDashboardState> {
  await validateSessionWallet(walletAddress);
  const profile = await getWalletProfile(walletAddress);

  if (profile.status !== "employer" || !profile.company) {
    throw new Error("Only a company owner can view the company dashboard");
  }

  // Capture in a local const so TypeScript narrowing is preserved inside async callbacks.
  const company = profile.company;

  const [companyEmployees, pendingTeam, platformAgents, companyDelegations] =
    await Promise.all([
      withRetry(
        () =>
          db
            .select({
              id: users.id,
              walletAddress: users.embeddedWalletAddress,
              smartAccountAddress: employeeProfiles.smartAccountAddress,
              createdAt: employeeProfiles.createdAt,
            })
            .from(companyMemberships)
            .innerJoin(users, eq(companyMemberships.userId, users.id))
            .innerJoin(employeeProfiles, and(
              eq(employeeProfiles.userId, users.id),
              eq(employeeProfiles.companyId, company.id),
            ))
            .where(and(
              eq(companyMemberships.companyId, company.id),
              eq(companyMemberships.canEmployee, true),
              eq(companyMemberships.status, "active"),
            )),
        "getCompanyDashboardState:employees"
      ),
      withRetry(
        () => db.select({ id: pendingEmployees.id, email: pendingEmployees.email, createdAt: pendingEmployees.createdAt })
          .from(pendingEmployees)
          .where(and(eq(pendingEmployees.companyId, company.id), eq(pendingEmployees.status, "pending"))),
        "getCompanyDashboardState:pending-employees"
      ),
      // Platform agents — global catalog, cached.
      (async () => {
        const cached = getCachedAgents();
        if (cached) return cached;
        const rows = await withRetry(
          () => db.select().from(agents).where(eq(agents.isActive, true)),
          "getCompanyDashboardState:agents"
        );
        const mapped = rows.map((agent) => ({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          smartAccountAddress: agent.smartAccountAddress,
          signerAddress: agent.signerAddress,
          isActive: agent.isActive,
          createdAt: agent.createdAt.toISOString(),
        }));
        setCachedAgents(mapped);
        return mapped;
      })(),
      getCompanyDelegationTree(company.id),
    ]);
  const companyDelegationIds = companyDelegations.map(
    (delegation) => delegation.id,
  );
  const companyCaveats =
    companyDelegationIds.length > 0
      ? await withRetry(
          () =>
            db
              .select()
              .from(delegationCaveats)
              .where(inArray(delegationCaveats.delegationId, companyDelegationIds)),
          "getCompanyDashboardState:caveats"
        )
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

  // Count active company → agent delegations (not total platform agent count).
  const activeAgentDelegationCount = activeDelegations.filter(
    (d) => d.delegateeType === "agent",
  ).length;

  let delegatedNativeEthAllowanceWei = 0n;

  if (activeDelegations.length > 0) {
    const activeDelegationIds = activeDelegations.map(
      (delegation) => delegation.id,
    );
    const nativeAllowanceCaveats = await withRetry(
      () =>
        db
          .select({
            caveatValue: delegationCaveats.caveatValue,
          })
          .from(delegationCaveats)
          .where(
            and(
              inArray(delegationCaveats.delegationId, activeDelegationIds),
              eq(delegationCaveats.caveatType, "nativeTokenTransferAmount"),
            ),
          ),
      "getCompanyDashboardState:allowanceCaveats"
    );

    delegatedNativeEthAllowanceWei = nativeAllowanceCaveats.reduce(
      (total, caveat) => total + extractNativeAllowanceWei(caveat.caveatValue),
      0n,
    );
  }

  const delegationsWithCaveats = companyDelegations.map((delegation) =>
    toCompanyDelegation(
      delegation,
      caveatsByDelegationId.get(delegation.id) ?? [],
    ),
  );

  // ── Calculate remaining ETH for each company → agent delegation ───────────
  for (const d of delegationsWithCaveats) {
    if (d.delegateeType !== "agent" || d.status !== "active") continue;
    const limitCaveat = d.caveats.find(
      (c) => c.caveatType === "nativeTokenTransferAmount",
    );
    if (!limitCaveat) continue;
    const limitWei = extractNativeAllowanceWei(limitCaveat.caveatValue);

    const bookingCondition = d.delegatorType === "company" 
      ? eq(agentBookings.agentId, d.delegateeId ?? "")
      : eq(agentBookings.delegationId, d.id);

    const [bookingResult] = await withRetry(
      () =>
        db
          .select({
            total: sql<string>`COALESCE(SUM(${agentBookings.amountEth}::numeric), 0)`,
          })
          .from(agentBookings)
          .where(bookingCondition),
      "getCompanyDashboardState:remainingBooking"
    );
    const bookingSpentWei = (() => {
      try {
        return bookingResult?.total ? parseEther(bookingResult.total) : 0n;
      } catch {
        return 0n;
      }
    })();

    const claimCondition = d.delegatorType === "company"
      ? eq(claimRedemptions.agentId, d.delegateeId ?? "")
      : and(
          eq(claimRedemptions.employeeId, d.delegatorId ?? ""),
          eq(claimRedemptions.agentId, d.delegateeId ?? "")
        );

    const [claimResult] = await withRetry(
      () =>
        db
          .select({
            total: sql<string>`COALESCE(SUM(${claimRedemptions.amountEth}::numeric), 0)`,
          })
          .from(claimRedemptions)
          .where(claimCondition),
      "getCompanyDashboardState:remainingClaim"
    );
    const claimSpentWei = (() => {
      try {
        return claimResult?.total ? parseEther(claimResult.total) : 0n;
      } catch {
        return 0n;
      }
    })();

    const totalSpentWei = bookingSpentWei + claimSpentWei;
    const remainingWei = limitWei > totalSpentWei ? limitWei - totalSpentWei : 0n;
    d.remainingEth = formatEthAllowance(remainingWei);
  }

  return {
    company,
    employees: companyEmployees.map((employee) => ({
      ...employee,
      createdAt: employee.createdAt.toISOString(),
    })),
    pendingEmployees: pendingTeam.map((employee) => ({ ...employee, createdAt: employee.createdAt.toISOString() })),
    companyPolicy: company.companyPolicy,
    agents: platformAgents,
    delegations: delegationsWithCaveats,
    summary: {
      employeeCount: companyEmployees.length,
      activeAgentCount: activeAgentDelegationCount,
      activeDelegationCount: activeDelegations.length,
      delegatedNativeEthAllowance: formatEthAllowance(
        delegatedNativeEthAllowanceWei,
      ),
    },
  };
}

// ---------------------------------------------------------------------------
// Employee dashboard state
// ---------------------------------------------------------------------------

export type EmployeeDashboardState = {
  employee: {
    id: string;
    walletAddress: string;
    smartAccountAddress: string | null;
  };
  company: ProfileCompany;
  /** The single active inbound delegation from the company to this employee, if any. */
  inboundDelegation: CompanyDelegation | null;
  /** Redelegations created BY this employee (delegator_type = 'user', delegator_id = employee.id). */
  outboundDelegations: CompanyDelegation[];
  /** All active platform agents — available for the employee to redelegate to. */
  agents: PlatformAgent[];
  /** Company-wide expense policy — passed through to Venice AI checks. */
  companyPolicy: string | null;
  summary: {
    /** ETH limit approved by the company (from the inbound delegation caveats). */
    approvedLimitEth: string;
    /** Sum of nativeTokenTransferAmount across active outbound delegations. */
    redelegatedEth: string;
    /** Number of active outbound agent delegations. */
    activeAgentCount: number;
    /** Total ETH already spent via direct delegate spends. */
    spentEth: string;
  };
  /** List of agent IDs that the company has activated (delegated to). */
  activeCompanyAgentIds: string[];
};

export async function getEmployeeDashboardState(
  walletAddress: string,
): Promise<EmployeeDashboardState> {
  await validateSessionWallet(walletAddress);
  const profile = await getWalletProfile(walletAddress);

  if (profile.status !== "employee" || !profile.user || !profile.company) {
    throw new Error("Only an employee with a company can view this dashboard");
  }

  const { user } = profile;
  const company = profile.company;

  // ── Inbound delegation (company → this employee) ─────────────────────────
  const [inboundRow] = await withRetry(
    () =>
      db
        .select()
        .from(delegations)
        .where(
          and(
            eq(delegations.delegatorType, "company"),
            eq(delegations.delegatorId, company.id),
            eq(delegations.delegateeType, "user"),
            eq(delegations.delegateeId, user.id),
            eq(delegations.status, "active"),
          ),
        )
        .limit(1),
    "getEmployeeDashboardState:inbound"
  );

  // ── Outbound delegations (this employee → agents) ────────────────────────
  const outboundRows = await withRetry(
    () =>
      db
        .select()
        .from(delegations)
        .where(
          and(
            eq(delegations.delegatorType, "user"),
            eq(delegations.delegatorId, user.id),
          ),
        ),
    "getEmployeeDashboardState:outbound"
  );

  // ── Company → agent delegations (to check if employer activated agents) ──
  const companyAgentRows = await withRetry(
    () =>
      db
        .select()
        .from(delegations)
        .where(
          and(
            eq(delegations.delegatorType, "company"),
            eq(delegations.delegatorId, company.id),
            eq(delegations.delegateeType, "agent"),
            eq(delegations.status, "active"),
          ),
        ),
    "getEmployeeDashboardState:companyAgents"
  );
  const activeCompanyAgentIds = companyAgentRows.map((d) => d.delegateeId).filter(Boolean) as string[];

  // ── Caveats for all relevant delegations ─────────────────────────────────
  const allDelegationIds = [
    ...(inboundRow ? [inboundRow.id] : []),
    ...outboundRows.map((d) => d.id),
  ];

  const allCaveats =
    allDelegationIds.length > 0
      ? await withRetry(
          () =>
            db
              .select()
              .from(delegationCaveats)
              .where(inArray(delegationCaveats.delegationId, allDelegationIds)),
          "getEmployeeDashboardState:caveats"
        )
      : [];

  const caveatsByDelegationId = new Map<string, CompanyDelegationCaveat[]>();
  for (const caveat of allCaveats.map(toCompanyDelegationCaveat)) {
    const existing = caveatsByDelegationId.get(caveat.delegationId) ?? [];
    existing.push(caveat);
    caveatsByDelegationId.set(caveat.delegationId, existing);
  }

  const inboundDelegation = inboundRow
    ? toCompanyDelegation(inboundRow, caveatsByDelegationId.get(inboundRow.id) ?? [])
    : null;

  const outboundDelegations = outboundRows.map((d) =>
    toCompanyDelegation(d, caveatsByDelegationId.get(d.id) ?? []),
  );

  // ── Calculate remaining ETH for each outbound delegation ──────────────────
  for (const d of outboundDelegations) {
    const limitCaveat = d.caveats.find(
      (c) => c.caveatType === "nativeTokenTransferAmount",
    );
    if (!limitCaveat) continue;
    const limitWei = extractNativeAllowanceWei(limitCaveat.caveatValue);

    // Sum of agent bookings for this delegation
    const [bookingResult] = await withRetry(
      () =>
        db
          .select({
            total: sql<string>`COALESCE(SUM(${agentBookings.amountEth}::numeric), 0)`,
          })
          .from(agentBookings)
          .where(eq(agentBookings.delegationId, d.id)),
      "getEmployeeDashboardState:remainingBooking"
    );
    const bookingSpentWei = (() => {
      try {
        return bookingResult?.total ? parseEther(bookingResult.total) : 0n;
      } catch {
        return 0n;
      }
    })();

    // Sum of claim redemptions for this employee + agent
    const [claimResult] = await withRetry(
      () =>
        db
          .select({
            total: sql<string>`COALESCE(SUM(${claimRedemptions.amountEth}::numeric), 0)`,
          })
          .from(claimRedemptions)
          .where(
            and(
              eq(claimRedemptions.employeeId, user.id),
              eq(claimRedemptions.agentId, d.delegateeId ?? ""),
            ),
          ),
      "getEmployeeDashboardState:remainingClaim"
    );
    const claimSpentWei = (() => {
      try {
        return claimResult?.total ? parseEther(claimResult.total) : 0n;
      } catch {
        return 0n;
      }
    })();

    const totalSpentWei = bookingSpentWei + claimSpentWei;
    
    // Store spentWei on the delegation object to be able to extract it for revoked ones
    (d as any).spentWei = totalSpentWei;

    const remainingWei = limitWei > totalSpentWei ? limitWei - totalSpentWei : 0n;
    d.remainingEth = formatEthAllowance(remainingWei);
  }

  // ── Summary metrics ───────────────────────────────────────────────────────
  const approvedLimitWei = inboundDelegation
    ? (inboundDelegation.caveats
        .filter((c) => c.caveatType === "nativeTokenTransferAmount")
        .reduce((sum, c) => sum + extractNativeAllowanceWei(c.caveatValue), 0n))
    : 0n;

  const activeOutbound = outboundDelegations.filter((d) => d.status === "active");

  const redelegatedWei = activeOutbound.reduce((sum, d) => {
    const limitCaveat = d.caveats.find(
      (c) => c.caveatType === "nativeTokenTransferAmount",
    );
    return sum + (limitCaveat ? extractNativeAllowanceWei(limitCaveat.caveatValue) : 0n);
  }, 0n);

  const activeAgentCount = activeOutbound.filter(
    (d) => d.delegateeType === "agent",
  ).length;

  // ── Amount already spent via direct delegate spends ────────────────────────
  const spentWei = inboundRow
    ? (await withRetry(
        () =>
          db
            .select()
            .from(manualTransactions)
            .where(
              and(
                eq(manualTransactions.delegationId, inboundRow.id),
                eq(manualTransactions.employeeId, user.id),
              ),
            ),
        "getEmployeeDashboardState:spent"
      )).reduce((sum, tx) => {
        try {
          return sum + parseEther(tx.amountEth);
        } catch {
          return sum;
        }
      }, 0n)
    : 0n;

  // Add the spent amounts of REVOKED delegations
  const revokedSpentWei = outboundDelegations
    .filter((d) => d.status !== "active")
    .reduce((sum, d) => sum + ((d as any).spentWei || 0n), 0n);

  const totalEmployeeSpentWei = spentWei + revokedSpentWei;

  // ── Platform agent catalog ────────────────────────────────────────────────
  let platformAgents = getCachedAgents();
  if (!platformAgents) {
    const rows = await withRetry(
      () => db.select().from(agents).where(eq(agents.isActive, true)),
      "getEmployeeDashboardState:agents"
    );
    platformAgents = rows.map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      smartAccountAddress: agent.smartAccountAddress,
      signerAddress: agent.signerAddress,
      isActive: agent.isActive,
      createdAt: agent.createdAt.toISOString(),
    }));
    setCachedAgents(platformAgents);
  }

  return {
    employee: {
      id: user.id,
      walletAddress: user.walletAddress,
      smartAccountAddress: user.smartAccountAddress,
    },
    company,
    companyPolicy: company.companyPolicy,
    inboundDelegation,
    outboundDelegations,
    agents: platformAgents,
    activeCompanyAgentIds,
    summary: {
      approvedLimitEth: formatEthAllowance(approvedLimitWei),
      redelegatedEth: formatEthAllowance(redelegatedWei),
      spentEth: formatEthAllowance(totalEmployeeSpentWei),
      activeAgentCount,
    },
  };
}

// ---------------------------------------------------------------------------
// Agent smart account lookup (used by employee signing flow)
// ---------------------------------------------------------------------------

export async function getAgentSmartAccountAddress(agentId: string): Promise<`0x${string}`> {
  const [agent] = await withRetry(
    () =>
      db
        .select({ smartAccountAddress: agents.smartAccountAddress })
        .from(agents)
        .where(eq(agents.id, agentId))
        .limit(1),
    "getAgentSmartAccountAddress"
  );

  if (!agent) {
    throw new Error("Agent not found");
  }

  return agent.smartAccountAddress as `0x${string}`;
}

// ---------------------------------------------------------------------------
// Parent / child caveat validation
// ---------------------------------------------------------------------------

/**
 * Validates that child caveats do not exceed the limits set by parent caveats.
 * Throws a descriptive Error for any violation found.
 */
function validateChildCaveats(
  parentCaveats: CompanyDelegationCaveat[],
  childCaveats: DelegationCaveatInput,
) {
  // ── Max transfer amount ─────────────────────────────────────────────────────
  const parentAmountCaveat = parentCaveats.find(
    (c) => c.caveatType === "nativeTokenTransferAmount",
  );
  if (parentAmountCaveat) {
    const parentMaxWei = extractNativeAllowanceWei(parentAmountCaveat.caveatValue);
    const childMaxWei = parsePositiveEthToWei(childCaveats.maxAmountEth, "Maximum amount");
    if (childMaxWei > parentMaxWei) {
      throw new Error(
        `Spending limit (${formatEthAllowance(childMaxWei)} ETH) cannot exceed the parent delegation limit (${formatEthAllowance(parentMaxWei)} ETH).`,
      );
    }
  }

  // ── Period transfer amount ──────────────────────────────────────────────────
  if (childCaveats.period && childCaveats.period !== "none") {
    const parentPeriodCaveat = parentCaveats.find(
      (c) => c.caveatType === "nativeTokenPeriodTransfer",
    );
    if (parentPeriodCaveat) {
      const parentVal = parentPeriodCaveat.caveatValue as Record<string, unknown>;
      const parentPeriodWei = extractNativeAllowanceWei(
        parentVal.periodAmount ?? parentVal.amount ?? "0",
      );
      const childPeriodWei = parsePositiveEthToWei(
        childCaveats.periodAmountEth ?? childCaveats.maxAmountEth,
        "Period amount",
      );
      if (childPeriodWei > parentPeriodWei) {
        throw new Error(
          `Period allowance (${formatEthAllowance(childPeriodWei)} ETH) cannot exceed the parent period limit (${formatEthAllowance(parentPeriodWei)} ETH).`,
        );
      }

      // Child period duration must be >= parent (child cannot be more permissive)
      const parentPeriodDuration =
        typeof parentVal.periodDuration === "number" ? parentVal.periodDuration : 0;
      const childPeriodDuration = periodDurations[childCaveats.period] ?? 0;
      if (childPeriodDuration < parentPeriodDuration) {
        throw new Error(
          "Child delegation period cannot be more frequent than the parent period.",
        );
      }
    }
  }

  // ── Per-transaction cap ─────────────────────────────────────────────────────
  if (childCaveats.perTransactionCapEth?.trim()) {
    const parentCapCaveat = parentCaveats.find((c) => c.caveatType === "valueLte");
    if (parentCapCaveat) {
      const parentCapVal = parentCapCaveat.caveatValue as Record<string, unknown>;
      const parentCapWei = extractNativeAllowanceWei(
        parentCapVal.maxValue ?? parentCapVal.valueWei ?? "0",
      );
      const childCapWei = parsePositiveEthToWei(
        childCaveats.perTransactionCapEth,
        "Per-transaction cap",
      );
      if (childCapWei > parentCapWei) {
        throw new Error(
          `Per-transaction cap (${formatEthAllowance(childCapWei)} ETH) cannot exceed the parent cap (${formatEthAllowance(parentCapWei)} ETH).`,
        );
      }
    }
  }

  // ── Allowed targets ─────────────────────────────────────────────────────────
  const parentTargetCaveat = parentCaveats.find((c) => c.caveatType === "allowedTargets");
  if (parentTargetCaveat) {
    const parentTargetVal = parentTargetCaveat.caveatValue as Record<string, unknown>;
    const parentTargets = Array.isArray(parentTargetVal.targets)
      ? (parentTargetVal.targets as string[]).map((t) => t.toLowerCase())
      : [];

    if (parentTargets.length > 0) {
      const childTargets = normalizeAddressList(childCaveats.allowedTargets, "Allowed targets");
      const invalidTargets = childTargets.filter(
        (t) => !parentTargets.includes(t.toLowerCase()),
      );
      if (invalidTargets.length > 0) {
        throw new Error(
          `Child delegation targets include addresses not permitted by the parent: ${invalidTargets.join(", ")}`,
        );
      }
    }
  }

  // ── Limited calls ───────────────────────────────────────────────────────────
  if (childCaveats.limitedCalls !== null && childCaveats.limitedCalls !== undefined) {
    const parentCallsCaveat = parentCaveats.find((c) => c.caveatType === "limitedCalls");
    if (parentCallsCaveat) {
      const parentCallsVal = parentCallsCaveat.caveatValue as Record<string, unknown>;
      const parentLimit =
        typeof parentCallsVal.limit === "number" ? parentCallsVal.limit : Infinity;
      if (childCaveats.limitedCalls > parentLimit) {
        throw new Error(
          `Transaction limit (${childCaveats.limitedCalls}) cannot exceed the parent limit (${parentLimit}).`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helper: resolve employee profile or throw
// ---------------------------------------------------------------------------

type EmployeeProfile = Extract<WalletProfile, { status: "employee" }> & {
  company: ProfileCompany;
};

async function getEmployeeProfileOrThrow(
  walletAddress: string,
): Promise<EmployeeProfile> {
  const profile = await getWalletProfile(walletAddress);

  if (profile.status !== "employee" || !profile.user || !profile.company) {
    throw new Error("Only an employee with a company can perform this action");
  }

  return profile as EmployeeProfile;
}

/**
 * Fetches the employee's active inbound delegation (company → employee) or throws.
 */
async function getEmployeeInboundDelegationOrThrow(
  employeeId: string,
  companyId: string,
) {
  const [row] = await db
    .select()
    .from(delegations)
    .where(
      and(
        eq(delegations.delegatorType, "company"),
        eq(delegations.delegatorId, companyId),
        eq(delegations.delegateeType, "user"),
        eq(delegations.delegateeId, employeeId),
        eq(delegations.status, "active"),
      ),
    )
    .limit(1);

  if (!row) {
    throw new Error(
      "No active inbound delegation found. The company must activate a delegation to you first.",
    );
  }

  return row;
}

/**
 * Fetches one of the employee's own outbound delegations or throws.
 * Scoped so employees can only manage delegations they created.
 */
async function getEmployeeOwnDelegationOrThrow(
  employeeId: string,
  delegationId: string,
) {
  const [delegation] = await db
    .select()
    .from(delegations)
    .where(
      and(
        eq(delegations.id, delegationId),
        eq(delegations.delegatorType, "user"),
        eq(delegations.delegatorId, employeeId),
      ),
    )
    .limit(1);

  if (!delegation) {
    throw new Error("Delegation not found or you do not have permission to manage it");
  }

  return delegation;
}

// ---------------------------------------------------------------------------
// Task 1: createAgentRedelegation
// ---------------------------------------------------------------------------

export async function createAgentRedelegation(input: {
  walletAddress: string;
  agentId: string;
  canvasPositionX?: number;
  canvasPositionY?: number;
}): Promise<EmployeeDashboardState> {
  const profile = await getEmployeeProfileOrThrow(input.walletAddress);
  await validateSessionWallet(input.walletAddress);
  const { user, company } = profile;

  // Verify the agent exists
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, input.agentId))
    .limit(1);

  if (!agent) {
    throw new Error("Agent not found");
  }

  // Verify active inbound delegation exists (employee must have received authority)
  const inboundRow = await getEmployeeInboundDelegationOrThrow(user.id, company.id);

  // Prevent duplicate active/pending-config redelegations to the same agent
  const [existing] = await db
    .select()
    .from(delegations)
    .where(
      and(
        eq(delegations.delegatorType, "user"),
        eq(delegations.delegatorId, user.id),
        eq(delegations.delegateeType, "agent"),
        eq(delegations.delegateeId, input.agentId),
        inArray(delegations.status, ["pending_config", "active"]),
      ),
    )
    .limit(1);

  if (existing) {
    // Already exists — just return current state
    return getEmployeeDashboardState(input.walletAddress);
  }

  const offset = Math.floor(Math.random() * 80) - 40; // stagger to avoid collision
  await db.insert(delegations).values({
    delegatorType: "user",
    delegatorId: user.id,
    delegateeType: "agent",
    delegateeId: input.agentId,
    parentDelegationId: inboundRow.id,
    canvasPositionX: input.canvasPositionX ?? 420 + offset,
    canvasPositionY: input.canvasPositionY ?? 120 + offset,
  });

  return getEmployeeDashboardState(input.walletAddress);
}

// ---------------------------------------------------------------------------
// Task 2a: saveEmployeeRedelegationCaveats
// ---------------------------------------------------------------------------

export async function saveEmployeeRedelegationCaveats(input: {
  walletAddress: string;
  delegationId: string;
  caveats: DelegationCaveatInput;
}): Promise<EmployeeDashboardState> {
  const profile = await getEmployeeProfileOrThrow(input.walletAddress);
  await validateSessionWallet(input.walletAddress);
  const { user, company } = profile;

  const delegation = await getEmployeeOwnDelegationOrThrow(user.id, input.delegationId);

  if (delegation.status === "revoked") {
    throw new Error("Revoked delegations cannot be edited");
  }

  // Load parent inbound delegation caveats for child validation
  const inboundRow = await getEmployeeInboundDelegationOrThrow(user.id, company.id);
  const parentCaveats = await db
    .select()
    .from(delegationCaveats)
    .where(eq(delegationCaveats.delegationId, inboundRow.id));

  // Validate child caveats don't exceed parent limits
  validateChildCaveats(parentCaveats.map(toCompanyDelegationCaveat), input.caveats);

  const caveatRows = buildCaveatRows(input.caveats);

  await db
    .delete(delegationCaveats)
    .where(eq(delegationCaveats.delegationId, input.delegationId));

  if (caveatRows.length > 0) {
    await db.insert(delegationCaveats).values(
      caveatRows.map((row) => ({ ...row, delegationId: input.delegationId })),
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

  return getEmployeeDashboardState(input.walletAddress);
}

// ---------------------------------------------------------------------------
// Task 2b: activateEmployeeDelegation
// ---------------------------------------------------------------------------

export async function activateEmployeeDelegation(input: {
  walletAddress: string;
  delegationId: string;
  delegationHash: string;
  signedDelegation: unknown;
}): Promise<EmployeeDashboardState> {
  const profile = await getEmployeeProfileOrThrow(input.walletAddress);
  await validateSessionWallet(input.walletAddress);
  const { user } = profile;

  const delegation = await getEmployeeOwnDelegationOrThrow(user.id, input.delegationId);

  if (delegation.status === "revoked") {
    throw new Error("Revoked delegations cannot be activated");
  }

  if (!user.smartAccountAddress) {
    throw new Error("Activate your smart account first");
  }

  const savedCaveats = await db
    .select()
    .from(delegationCaveats)
    .where(eq(delegationCaveats.delegationId, delegation.id));

  if (savedCaveats.length === 0) {
    throw new Error("Configure caveats before activation");
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

  return getEmployeeDashboardState(input.walletAddress);
}

// ---------------------------------------------------------------------------
// Task 3: revokeEmployeeDelegation
// ---------------------------------------------------------------------------

export async function revokeEmployeeDelegation(input: {
  walletAddress: string;
  delegationId: string;
}): Promise<EmployeeDashboardState> {
  const profile = await getEmployeeProfileOrThrow(input.walletAddress);
  await validateSessionWallet(input.walletAddress);
  const { user } = profile;

  // Scoped check: only the employee's own outbound delegations
  await getEmployeeOwnDelegationOrThrow(user.id, input.delegationId);

  const descendantIds = await getDescendantDelegationIds([input.delegationId]);
  const idsToRevoke = [input.delegationId, ...descendantIds];
  const revokedAt = new Date();

  await db
    .update(delegations)
    .set({ status: "revoked", revokedAt })
    .where(inArray(delegations.id, idsToRevoke));

  return getEmployeeDashboardState(input.walletAddress);
}
