CREATE TYPE "public"."caveat_type" AS ENUM('nativeTokenTransferAmount', 'nativeTokenPeriodTransfer', 'valueLte', 'allowedTargets', 'redeemer', 'limitedCalls', 'custom');--> statement-breakpoint
CREATE TYPE "public"."delegatee_type" AS ENUM('user', 'agent', 'eoa');--> statement-breakpoint
CREATE TYPE "public"."delegation_status" AS ENUM('pending_config', 'active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."delegator_type" AS ENUM('company', 'user', 'agent');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('employer', 'employee');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company_id" uuid NOT NULL,
	"smart_account_address" text NOT NULL,
	"backend_signer_address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"smart_account_address" text,
	"invite_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delegation_caveats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delegation_id" uuid NOT NULL,
	"caveat_type" "caveat_type" NOT NULL,
	"caveat_value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delegations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_delegation_id" uuid,
	"delegator_type" "delegator_type" NOT NULL,
	"delegator_id" uuid NOT NULL,
	"delegatee_type" "delegatee_type" NOT NULL,
	"delegatee_id" uuid,
	"delegatee_address" text,
	"delegatee_label" text,
	"delegation_hash" text,
	"status" "delegation_status" DEFAULT 'pending_config' NOT NULL,
	"canvas_position_x" double precision DEFAULT 0 NOT NULL,
	"canvas_position_y" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"invite_code" text NOT NULL,
	"accepted_by_user_id" uuid,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"embedded_wallet_address" text NOT NULL,
	"smart_account_address" text,
	"role" "user_role" NOT NULL,
	"company_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegation_caveats" ADD CONSTRAINT "delegation_caveats_delegation_id_delegations_id_fk" FOREIGN KEY ("delegation_id") REFERENCES "public"."delegations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_parent_delegation_id_delegations_id_fk" FOREIGN KEY ("parent_delegation_id") REFERENCES "public"."delegations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agents_company_id_idx" ON "agents" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agents_smart_account_address_unique" ON "agents" USING btree ("smart_account_address");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_owner_id_unique" ON "companies" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_invite_code_unique" ON "companies" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "delegation_caveats_delegation_id_idx" ON "delegation_caveats" USING btree ("delegation_id");--> statement-breakpoint
CREATE INDEX "delegation_caveats_caveat_type_idx" ON "delegation_caveats" USING btree ("caveat_type");--> statement-breakpoint
CREATE INDEX "delegations_parent_delegation_id_idx" ON "delegations" USING btree ("parent_delegation_id");--> statement-breakpoint
CREATE INDEX "delegations_delegator_idx" ON "delegations" USING btree ("delegator_type","delegator_id");--> statement-breakpoint
CREATE INDEX "delegations_delegatee_idx" ON "delegations" USING btree ("delegatee_type","delegatee_id");--> statement-breakpoint
CREATE INDEX "delegations_status_idx" ON "delegations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "delegations_delegation_hash_unique" ON "delegations" USING btree ("delegation_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "invites_invite_code_unique" ON "invites" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "invites_company_id_idx" ON "invites" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "invites_accepted_by_user_id_idx" ON "invites" USING btree ("accepted_by_user_id");--> statement-breakpoint
CREATE INDEX "invites_status_idx" ON "invites" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_embedded_wallet_address_unique" ON "users" USING btree ("embedded_wallet_address");--> statement-breakpoint
CREATE INDEX "users_company_id_idx" ON "users" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");