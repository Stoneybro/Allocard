ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "privy_user_id" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verified_email" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_privy_user_id_unique" ON "users" USING btree ("privy_user_id");
