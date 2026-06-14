import { db } from "./apps/web/lib/db";
import { companies } from "./apps/web/lib/db/schema";

async function main() {
  const result = await db.select({ id: companies.id, name: companies.name, policy: companies.companyPolicy }).from(companies);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}
main().catch(console.error);
