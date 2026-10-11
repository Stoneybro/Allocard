DROP TABLE IF EXISTS "invites";
--> statement-breakpoint
DROP TYPE IF EXISTS "invite_status";
--> statement-breakpoint
DROP INDEX IF EXISTS "companies_invite_code_unique";
--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN IF EXISTS "invite_code";
