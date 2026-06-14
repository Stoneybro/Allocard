import { db } from "./apps/web/lib/db";
import { companies } from "./apps/web/lib/db/schema";

async function main() {
  await db.update(companies).set({ companyPolicy: "Allowed: Any legitimate business expense. This includes, but is not limited to: client meals, business travel/transit, office supplies, software subscriptions, API access, and cloud services (e.g., AWS, Vercel).\n\nProhibited: Any non-corporate or personal expenses. This explicitly includes: video games or consoles (e.g., Playstation, Xbox), personal electronics, luxury goods, spa/grooming, alcohol, and gift cards.\n\nRule: If an item does not clearly support a business objective, reject it." });
  console.log("Updated companies!");
  process.exit(0);
}
main().catch(console.error);
