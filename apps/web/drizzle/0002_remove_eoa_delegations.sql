DELETE FROM "delegations" WHERE "delegatee_type" = 'eoa';
--> statement-breakpoint
DROP INDEX IF EXISTS "delegations_delegatee_idx";
--> statement-breakpoint
ALTER TABLE "delegations" DROP COLUMN "delegatee_address";
--> statement-breakpoint
ALTER TABLE "delegations" DROP COLUMN "delegatee_label";
--> statement-breakpoint
ALTER TABLE "delegations" ALTER COLUMN "delegatee_type" TYPE text USING "delegatee_type"::text;
--> statement-breakpoint
DROP TYPE "public"."delegatee_type";
--> statement-breakpoint
CREATE TYPE "public"."delegatee_type" AS ENUM('user', 'agent');
--> statement-breakpoint
ALTER TABLE "delegations" ALTER COLUMN "delegatee_type" TYPE "public"."delegatee_type" USING "delegatee_type"::"public"."delegatee_type";
--> statement-breakpoint
CREATE INDEX "delegations_delegatee_idx" ON "delegations" USING btree ("delegatee_type","delegatee_id");
