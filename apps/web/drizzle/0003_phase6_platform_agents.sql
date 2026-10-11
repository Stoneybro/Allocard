-- Phase 6: Convert agents to platform-owned and add claim_redemptions audit table

-- 1. Drop the company-scoped index and FK constraint on agents
DROP INDEX IF EXISTS "agents_company_id_idx";
--> statement-breakpoint

-- 2. Drop the company_id column (agents are now platform-owned)
ALTER TABLE "agents" DROP COLUMN IF EXISTS "company_id";
--> statement-breakpoint

-- 3. Drop old backend_signer_address column (replaced by signer_address)
ALTER TABLE "agents" DROP COLUMN IF EXISTS "backend_signer_address";
--> statement-breakpoint

-- 4. Add new platform-agent columns
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "signer_address" text;
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
--> statement-breakpoint

-- 5. Add index on is_active for catalog queries
CREATE INDEX IF NOT EXISTS "agents_is_active_idx" ON "agents" USING btree ("is_active");
--> statement-breakpoint

-- 6. Create claim_status enum
DO $$ BEGIN
  CREATE TYPE "public"."claim_status" AS ENUM('pending', 'approved', 'rejected', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- 7. Create claim_redemptions audit table
CREATE TABLE IF NOT EXISTS "claim_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"employee_id" uuid,
	"company_id" uuid,
	"delegation_hash" text,
	"claim_description" text NOT NULL,
	"amount_eth" text NOT NULL,
	"receipt_url" text,
	"venice_prompt" text,
	"venice_approved" boolean,
	"venice_reasoning" text,
	"venice_confidence" double precision,
	"tx_hash" text,
	"status" "claim_status" NOT NULL DEFAULT 'pending',
	"created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

ALTER TABLE "claim_redemptions" ADD COLUMN IF NOT EXISTS "agent_id" uuid;
--> statement-breakpoint
ALTER TABLE "claim_redemptions" ADD COLUMN IF NOT EXISTS "employee_id" uuid;
--> statement-breakpoint
ALTER TABLE "claim_redemptions" ADD COLUMN IF NOT EXISTS "company_id" uuid;
--> statement-breakpoint
ALTER TABLE "claim_redemptions" ADD COLUMN IF NOT EXISTS "delegation_hash" text;
--> statement-breakpoint
ALTER TABLE "claim_redemptions" ADD COLUMN IF NOT EXISTS "claim_description" text;
--> statement-breakpoint
ALTER TABLE "claim_redemptions" ADD COLUMN IF NOT EXISTS "amount_eth" text;
--> statement-breakpoint
ALTER TABLE "claim_redemptions" ADD COLUMN IF NOT EXISTS "receipt_url" text;
--> statement-breakpoint
ALTER TABLE "claim_redemptions" ADD COLUMN IF NOT EXISTS "venice_prompt" text;
--> statement-breakpoint
ALTER TABLE "claim_redemptions" ADD COLUMN IF NOT EXISTS "venice_approved" boolean;
--> statement-breakpoint
ALTER TABLE "claim_redemptions" ADD COLUMN IF NOT EXISTS "venice_reasoning" text;
--> statement-breakpoint
ALTER TABLE "claim_redemptions" ADD COLUMN IF NOT EXISTS "venice_confidence" double precision;
--> statement-breakpoint
ALTER TABLE "claim_redemptions" ADD COLUMN IF NOT EXISTS "tx_hash" text;
--> statement-breakpoint
ALTER TABLE "claim_redemptions" ADD COLUMN IF NOT EXISTS "status" "claim_status" NOT NULL DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE "claim_redemptions" ADD COLUMN IF NOT EXISTS "created_at" timestamptz NOT NULL DEFAULT now();
--> statement-breakpoint

-- 8. FK constraints for claim_redemptions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claim_redemptions_agent_id_agents_id_fk' AND conrelid = 'public.claim_redemptions'::regclass) THEN
    ALTER TABLE "claim_redemptions" ADD CONSTRAINT "claim_redemptions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claim_redemptions_employee_id_users_id_fk' AND conrelid = 'public.claim_redemptions'::regclass) THEN
    ALTER TABLE "claim_redemptions" ADD CONSTRAINT "claim_redemptions_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claim_redemptions_company_id_companies_id_fk' AND conrelid = 'public.claim_redemptions'::regclass) THEN
    ALTER TABLE "claim_redemptions" ADD CONSTRAINT "claim_redemptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

-- 9. Indexes for claim_redemptions
CREATE INDEX IF NOT EXISTS "claim_redemptions_agent_id_idx" ON "claim_redemptions" USING btree ("agent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claim_redemptions_employee_id_idx" ON "claim_redemptions" USING btree ("employee_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claim_redemptions_company_id_idx" ON "claim_redemptions" USING btree ("company_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claim_redemptions_status_idx" ON "claim_redemptions" USING btree ("status");
--> statement-breakpoint

-- 10. Seed the three platform agents
-- Smart account addresses are placeholders — updated after deployment in Piece 3-5.
-- The signer_address is derived from AGENTS_PRIVATE_KEY (shared EOA for all three).
INSERT INTO "agents" ("name", "description", "smart_account_address", "signer_address", "is_active")
VALUES
  (
    'Reimbursement Agent',
    'Verifies employee expense claims against delegation policy using Venice AI and automatically reimburses approved amounts on-chain.',
    '0x0000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000000',
    true
  ),
  (
    'Travel Agent',
    'Books flights and hotels within your delegated spend cap. Uses Venice AI to research and select the best options for your travel request.',
    '0x0000000000000000000000000000000000000002',
    '0x0000000000000000000000000000000000000000',
    true
  ),
  (
    'Procurement Agent',
    'Researches and procures software tools and vendor subscriptions within your approved budget. Checks for duplicate subscriptions before spending.',
    '0x0000000000000000000000000000000000000003',
    '0x0000000000000000000000000000000000000000',
    true
  )
ON CONFLICT ("smart_account_address") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "signer_address" = EXCLUDED."signer_address",
  "is_active" = EXCLUDED."is_active";
