DO $$ BEGIN
  CREATE TYPE "membership_status" AS ENUM ('active', 'removed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "pending_employee_status" AS ENUM ('pending', 'accepted', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_memberships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
  "can_employer" boolean NOT NULL DEFAULT false,
  "can_employee" boolean NOT NULL DEFAULT false,
  "status" "membership_status" NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "removed_at" timestamptz
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_memberships_company_user_unique" ON "company_memberships" ("company_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_memberships_user_id_idx" ON "company_memberships" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_memberships_company_id_idx" ON "company_memberships" ("company_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "smart_account_address" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "employee_profiles_company_user_unique" ON "employee_profiles" ("company_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_profiles_user_id_idx" ON "employee_profiles" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pending_employees" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
  "email" text NOT NULL,
  "normalized_email" text NOT NULL,
  "status" "pending_employee_status" NOT NULL DEFAULT 'pending',
  "accepted_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "accepted_at" timestamptz
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pending_employees_company_email_unique" ON "pending_employees" ("company_id", "normalized_email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pending_employees_email_status_idx" ON "pending_employees" ("normalized_email", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_preferences" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "company_id" uuid REFERENCES "companies"("id") ON DELETE set null,
  "role" "user_role",
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
INSERT INTO "company_memberships" ("user_id", "company_id", "can_employer", "can_employee")
SELECT u."id", c."id", c."owner_id" = u."id", u."role" = 'employee' AND u."company_id" = c."id"
FROM "users" u JOIN "companies" c ON c."owner_id" = u."id" OR c."id" = u."company_id"
ON CONFLICT ("company_id", "user_id") DO UPDATE SET
  "can_employer" = EXCLUDED."can_employer",
  "can_employee" = EXCLUDED."can_employee";
--> statement-breakpoint
INSERT INTO "employee_profiles" ("company_id", "user_id", "smart_account_address", "created_at")
SELECT u."company_id", u."id", u."smart_account_address", u."created_at"
FROM "users" u WHERE u."role" = 'employee' AND u."company_id" IS NOT NULL
ON CONFLICT ("company_id", "user_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "workspace_preferences" ("user_id", "company_id", "role")
SELECT DISTINCT ON (m."user_id") m."user_id", m."company_id", CASE WHEN m."can_employer" THEN 'employer'::"user_role" ELSE 'employee'::"user_role" END
FROM "company_memberships" m WHERE m."status" = 'active'
ORDER BY m."user_id", m."can_employer" DESC, m."created_at" ASC;
--> statement-breakpoint
DROP INDEX IF EXISTS "companies_owner_id_unique";
