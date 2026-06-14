import { db } from "./apps/web/lib/db";
import { delegations } from "./apps/web/lib/db/schema";

async function main() {
  const result = await db.select({ id: delegations.id, policy: delegations.policyPrompt }).from(delegations);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}
main().catch(console.error);
