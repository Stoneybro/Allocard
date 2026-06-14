import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = 
  process.env.DATABASE_URL || 
  process.env.ALLOCARD_STORAGE_DATABASE_URL ||
  process.env.ALLOCARD_STORAGE_DATABASE_URL_UNPOOLED || 
  process.env.ALLOCARD_STORAGE_POSTGRES_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!databaseUrl) {
  throw new Error("DATABASE_URL or equivalent environment variable is required to initialize the database client");
}

const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });
