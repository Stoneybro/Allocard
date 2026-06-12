import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["employer", "employee"]);

export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "expired",
]);

export const delegationStatusEnum = pgEnum("delegation_status", [
  "pending_config",
  "active",
  "revoked",
]);

export const delegatorTypeEnum = pgEnum("delegator_type", [
  "company",
  "user",
  "agent",
]);

export const delegateeTypeEnum = pgEnum("delegatee_type", [
  "user",
  "agent",
]);

export const caveatTypeEnum = pgEnum("caveat_type", [
  "nativeTokenTransferAmount",
  "nativeTokenPeriodTransfer",
  "valueLte",
  "allowedTargets",
  "redeemer",
  "limitedCalls",
  "custom",
]);

export const claimStatusEnum = pgEnum("claim_status", [
  "pending",
  "approved",
  "rejected",
  "failed",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    embeddedWalletAddress: text("embedded_wallet_address").notNull(),
    smartAccountAddress: text("smart_account_address"),
    role: userRoleEnum("role").notNull(),
    companyId: uuid("company_id").references((): AnyPgColumn => companies.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_embedded_wallet_address_unique").on(
      table.embeddedWalletAddress,
    ),
    index("users_company_id_idx").on(table.companyId),
    index("users_role_idx").on(table.role),
  ],
);

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    smartAccountAddress: text("smart_account_address"),
    inviteCode: text("invite_code").notNull(),
    /** Company-wide expense policy document — the single source of truth
     *  for all Venice AI policy checks. Seeded with sensible defaults. */
    companyPolicy: text("company_policy"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("companies_owner_id_unique").on(table.ownerId),
    uniqueIndex("companies_invite_code_unique").on(table.inviteCode),
  ],
);

/**
 * Platform-owned AI agents. Not scoped to any company — all companies see
 * the same catalog. The backend signer key is stored in env vars; only the
 * signer's EOA address is stored here for reference.
 */
export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    /** The deployed smart account that receives delegations and redeems them. */
    smartAccountAddress: text("smart_account_address").notNull(),
    /** EOA address of the backend signer that controls the smart account. */
    signerAddress: text("signer_address").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("agents_is_active_idx").on(table.isActive),
    uniqueIndex("agents_smart_account_address_unique").on(
      table.smartAccountAddress,
    ),
  ],
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    inviteCode: text("invite_code").notNull(),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: inviteStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("invites_invite_code_unique").on(table.inviteCode),
    index("invites_company_id_idx").on(table.companyId),
    index("invites_accepted_by_user_id_idx").on(table.acceptedByUserId),
    index("invites_status_idx").on(table.status),
  ],
);

export const delegations = pgTable(
  "delegations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentDelegationId: uuid("parent_delegation_id").references(
      (): AnyPgColumn => delegations.id,
      { onDelete: "set null" },
    ),
    delegatorType: delegatorTypeEnum("delegator_type").notNull(),
    delegatorId: uuid("delegator_id").notNull(),
    delegateeType: delegateeTypeEnum("delegatee_type").notNull(),
    delegateeId: uuid("delegatee_id"),
    delegateeAddress: text("delegatee_address"),
    delegateeLabel: text("delegatee_label"),
    delegationHash: text("delegation_hash"),
    signedDelegation: jsonb("signed_delegation"),
    policyPrompt: text("policy_prompt"),
    status: delegationStatusEnum("status").notNull().default("pending_config"),
    canvasPositionX: doublePrecision("canvas_position_x").notNull().default(0),
    canvasPositionY: doublePrecision("canvas_position_y").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("delegations_parent_delegation_id_idx").on(table.parentDelegationId),
    index("delegations_delegator_idx").on(
      table.delegatorType,
      table.delegatorId,
    ),
    index("delegations_delegatee_idx").on(
      table.delegateeType,
      table.delegateeId,
    ),
    index("delegations_status_idx").on(table.status),
    uniqueIndex("delegations_delegation_hash_unique").on(table.delegationHash),
  ],
);

export const delegationCaveats = pgTable(
  "delegation_caveats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    delegationId: uuid("delegation_id")
      .notNull()
      .references(() => delegations.id, { onDelete: "cascade" }),
    caveatType: caveatTypeEnum("caveat_type").notNull(),
    caveatValue: jsonb("caveat_value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("delegation_caveats_delegation_id_idx").on(table.delegationId),
    index("delegation_caveats_caveat_type_idx").on(table.caveatType),
  ],
);

/**
 * Audit log for every agent claim attempt — approved, rejected, or failed.
 * Stores the full Venice reasoning, prompt, and on-chain tx hash for employer
 * visibility.
 */
export const claimRedemptions = pgTable(
  "claim_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    employeeId: uuid("employee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),
    /** Hash of the delegation that was (or would have been) redeemed. */
    delegationHash: text("delegation_hash"),
    claimDescription: text("claim_description").notNull(),
    amountEth: text("amount_eth").notNull(),
    /** Vercel Blob URL of the uploaded receipt image, if provided. */
    receiptUrl: text("receipt_url"),
    /** Full prompt text sent to Venice, stored for audit. */
    venicePrompt: text("venice_prompt"),
    veniceApproved: boolean("venice_approved"),
    veniceReasoning: text("venice_reasoning"),
    veniceConfidence: doublePrecision("venice_confidence"),
    /** On-chain tx hash of the UserOperation that redeemed the delegation. */
    txHash: text("tx_hash"),
    status: claimStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("claim_redemptions_agent_id_idx").on(table.agentId),
    index("claim_redemptions_employee_id_idx").on(table.employeeId),
    index("claim_redemptions_company_id_idx").on(table.companyId),
    index("claim_redemptions_status_idx").on(table.status),
  ],
);

export const agentBookings = pgTable(
  "agent_bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    delegationId: uuid("delegation_id").notNull().references(() => delegations.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    bookingDetails: jsonb("booking_details").notNull(),
    amountEth: numeric("amount_eth").notNull(),
    txHash: text("tx_hash"),
    venicePrompt: text("venice_prompt"),
    veniceReasoning: text("venice_reasoning"),
    veniceConfidence: doublePrecision("venice_confidence"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("agent_bookings_delegation_id_idx").on(table.delegationId),
    index("agent_bookings_employee_id_idx").on(table.employeeId),
  ]
);

export const manualTransactions = pgTable(
  "manual_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    delegationId: uuid("delegation_id").notNull().references(() => delegations.id, { onDelete: "cascade" }),
    toAddress: text("to_address").notNull(),
    amountEth: numeric("amount_eth").notNull(),
    purpose: text("purpose").notNull(),
    isFlagged: boolean("is_flagged").notNull().default(false),
    txHash: text("tx_hash"),
    receiptSummary: text("receipt_summary"), // Venice summary of the uploaded receipt
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("manual_transactions_delegation_id_idx").on(table.delegationId),
    index("manual_transactions_employee_id_idx").on(table.employeeId),
    index("manual_transactions_company_id_idx").on(table.companyId),
  ]
);
