-- The database may already have the post-migration enum without the legacy
-- value. Compare as text so the literal does not need to exist in the enum.
DELETE FROM "delegations" WHERE "delegatee_type"::text = 'eoa';
--> statement-breakpoint
DROP INDEX IF EXISTS "delegations_delegatee_idx";
--> statement-breakpoint
ALTER TABLE "delegations" DROP COLUMN IF EXISTS "delegatee_address";
--> statement-breakpoint
ALTER TABLE "delegations" DROP COLUMN IF EXISTS "delegatee_label";
--> statement-breakpoint
ALTER TABLE "delegations" ALTER COLUMN "delegatee_type" TYPE text USING "delegatee_type"::text;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."delegatee_type";
--> statement-breakpoint
CREATE TYPE "public"."delegatee_type" AS ENUM('user', 'agent');
--> statement-breakpoint
ALTER TABLE "delegations" ALTER COLUMN "delegatee_type" TYPE "public"."delegatee_type" USING "delegatee_type"::"public"."delegatee_type";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delegations_delegatee_idx" ON "delegations" USING btree ("delegatee_type","delegatee_id");
