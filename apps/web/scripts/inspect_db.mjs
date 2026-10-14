import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.ALLOCARD_STORAGE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Missing database URL in .env.local");
  process.exit(1);
}

const sql = neon(url);

async function main() {
  console.log("Listing tables in database...");
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  console.log("Tables found:", tables.map(t => t.table_name));

  for (const t of tables) {
    const countRes = await sql.query(`SELECT count(*) as count FROM "${t.table_name}"`);
    console.log(`- ${t.table_name}: ${countRes[0].count} rows`);
  }

  const agents = await sql`SELECT id, name, smart_account_address, signer_address, is_active FROM agents`;
  console.log("\nAgents currently in DB:", agents);
}

main().catch(console.error);
