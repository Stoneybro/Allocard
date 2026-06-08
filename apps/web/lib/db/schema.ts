import {
  doublePrecision,
  index,
  jsonb,
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
  "eoa",
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("companies_owner_id_unique").on(table.ownerId),
    uniqueIndex("companies_invite_code_unique").on(table.inviteCode),
  ],
);

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    smartAccountAddress: text("smart_account_address").notNull(),
    backendSignerAddress: text("backend_signer_address").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("agents_company_id_idx").on(table.companyId),
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
