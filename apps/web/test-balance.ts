import { db } from "./lib/db";
import { companyTable } from "./lib/db/schema";
import { createPublicClient, http, formatEther } from "viem";
import { baseSepolia } from "viem/chains";

async function main() {
  const companies = await db.select().from(companyTable);
  for (const c of companies) {
    if (c.smartAccountAddress) {
      console.log(`Company ${c.name} has smart account ${c.smartAccountAddress}`);
      const client = createPublicClient({ chain: baseSepolia, transport: http() });
      const balance = await client.getBalance({ address: c.smartAccountAddress as `0x${string}` });
      console.log(`Balance in wei: ${balance}`);
      console.log(`Balance in eth: ${formatEther(balance)}`);
    }
  }
}
main().catch(console.error);
