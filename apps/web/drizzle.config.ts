import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

const databaseUrl = 
  process.env.DATABASE_URL || 
  process.env.ALLOCARD_STORAGE_DATABASE_URL ||
  process.env.ALLOCARD_STORAGE_DATABASE_URL_UNPOOLED || 
  process.env.ALLOCARD_STORAGE_POSTGRES_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!databaseUrl) {
  throw new Error("DATABASE_URL or equivalent is required to run Drizzle commands");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
