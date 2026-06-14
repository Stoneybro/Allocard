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
import { withRetry } from "@/lib/db/withRetry";
import { requireSession } from "@/lib/auth-guard";


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

let _profileCache: CacheEntry<WalletProfile> | null = null;
const PROFILE_CACHE_TTL_MS = 2_000; // 2s — prevents duplicate fetches within a single request

function getCachedProfile(walletAddress: string): WalletProfile | null {
  // Only use cache if the address matches AND TTL hasn't expired
  if (_profileCache && Date.now() < _profileCache.expiresAt) {
    // We store the last profile; for a real app you'd use a Map keyed by address.
    // For a single-user server action this is sufficient.
    return _profileCache.data;
  }
  return null;
}

function setCachedProfile(profile: WalletProfile) {
  _profileCache = { data: profile, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS };
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
  inviteCode: string;
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

async function getCompanyForUser(user: typeof users.$inferSelect) {
  if (user.role === "employer") {
    const [company] = await withRetry(() => db
      .select()
      .from(companies)
      .where(eq(companies.ownerId, user.id))
      .limit(1), "getCompanyForUser:employer");

    return company ?? null;
  }

  if (!user.companyId) {
    return null;
  }

  const companyId = user.companyId;

  const [company] = await withRetry(() => db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1), "getCompanyForUser:employee");

  return company ?? null;
}

export async function getWalletProfile(address: string): Promise<WalletProfile> {
  const walletAddress = normalizeWalletAddress(address);

  // Check short-lived cache to prevent duplicate DB queries within a single request
  const cached = getCachedProfile(walletAddress);
  if (cached) return cached;

  const [user] = await withRetry(() =>
    db
      .select()
      .from(users)
      .where(eq(users.embeddedWalletAddress, walletAddress))
      .limit(1),
    "getWalletProfile:user"
  );

  if (!user) {
    const result: WalletProfile = {
      status: "new",
      user: null,
      company: null,
    };
    setCachedProfile(result);
    return result;
  }

  const company = await getCompanyForUser(user);

  const result: WalletProfile = {
    status: user.role,
    user: toProfileUser(user),
    company: company ? toProfileCompany(company) : null,
  };
  setCachedProfile(result);
  return result;
}

export async function createEmployerAccount(input: {
  walletAddress: string;
  companyName: string;
}) {
  const walletAddress = normalizeWalletAddress(input.walletAddress);
  await validateSessionWallet(walletAddress);
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
  await validateSessionWallet(walletAddress);

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
  await validateSessionWallet(walletAddress);
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

  const [companyEmployees, platformAgents, companyDelegations] =
    await Promise.all([
      withRetry(
        () =>
          db
            .select({
              id: users.id,
              walletAddress: users.embeddedWalletAddress,
              smartAccountAddress: users.smartAccountAddress,
              createdAt: users.createdAt,
            })
            .from(users)
            .where(
              and(eq(users.companyId, company.id), eq(users.role, "employee")),
            ),
        "getCompanyDashboardState:employees"
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

  return {
    company,
    employees: companyEmployees.map((employee) => ({
      ...employee,
      createdAt: employee.createdAt.toISOString(),
    })),
    companyPolicy: company.companyPolicy,
    agents: platformAgents,
    delegations: companyDelegations.map((delegation) =>
      toCompanyDelegation(
        delegation,
        caveatsByDelegationId.get(delegation.id) ?? [],
      ),
    ),
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
