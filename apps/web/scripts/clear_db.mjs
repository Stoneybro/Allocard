import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.ALLOCARD_STORAGE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Missing database URL in .env.local");
  process.exit(1);
}

const sql = neon(url);

const CORE_AGENTS = [
  {
    name: 'Reimbursement Agent',
    description: 'Verifies employee expense claims against delegation policy using Venice AI and automatically reimburses approved amounts on-chain.',
    smart_account_address: '0xD61C510c51a1DD4a73C4Dfeca6893aeEE6A731c1',
    signer_address: '0x0D96081998fd583334fd1757645B40fdD989B267',
    is_active: true
  },
  {
    name: 'Agora Remittance Agent',
    description: 'Facilitates high-speed cross-border contractor payouts and expense remittances via Agora AUSD with real-time routing.',
    smart_account_address: '0x916BE00E5cCd1A3a7930f20dFDC55D21947B8903',
    signer_address: '0x0D96081998fd583334fd1757645B40fdD989B267',
    is_active: true
  },
  {
    name: 'Cloud & Tooling Agent',
    description: 'Researches and procures software tools and vendor subscriptions within your approved budget. Checks for duplicate subscriptions before spending.',
    smart_account_address: '0x1Cf7F91e72727AEfFb31603CBD3a7d5Ae03aa922',
    signer_address: '0x0D96081998fd583334fd1757645B40fdD989B267',
    is_active: true
  }
];

async function main() {
  console.log("=== Allocard Database Reset Tool ===");
  
  // 1. Snapshot current agents
  const existingAgents = await sql`SELECT * FROM agents`;
  console.log(`Found ${existingAgents.length} agents in database.`);
  
  // 2. Clear all user, company, delegation, transaction and audit tables
  const userTables = [
    'claim_redemptions',
    'agent_bookings',
    'manual_transactions',
    'delegation_caveats',
    'delegations',
    'workspace_preferences',
    'company_memberships',
    'pending_employees',
    'employee_profiles',
    'companies',
    'users'
  ];

  console.log("Truncating user, company, delegation, and transaction tables...");
  for (const table of userTables) {
    await sql.query(`DELETE FROM "${table}"`);
    console.log(`- Cleared ${table}`);
  }

  // 3. Ensure agents table has the core platform agents
  const agentsCount = await sql`SELECT count(*) as count FROM agents`;
  if (Number(agentsCount[0].count) === 0) {
    console.log("Re-seeding platform agents...");
    for (const agent of CORE_AGENTS) {
      await sql`
        INSERT INTO agents (name, description, smart_account_address, signer_address, is_active)
        VALUES (${agent.name}, ${agent.description}, ${agent.smart_account_address}, ${agent.signer_address}, ${agent.is_active})
        ON CONFLICT (smart_account_address) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          signer_address = EXCLUDED.signer_address,
          is_active = EXCLUDED.is_active
      `;
    }
    console.log("Platform agents re-seeded successfully.");
  } else {
    console.log(`Platform agents preserved (${agentsCount[0].count} agents active).`);
  }

  // 4. Verification summary
  console.log("\n=== Final Table Row Counts ===");
  const allTables = [
    'users',
    'companies',
    'company_memberships',
    'employee_profiles',
    'pending_employees',
    'workspace_preferences',
    'delegations',
    'delegation_caveats',
    'manual_transactions',
    'agent_bookings',
    'claim_redemptions',
    'agents'
  ];

  for (const t of allTables) {
    const res = await sql.query(`SELECT count(*) as count FROM "${t}"`);
    console.log(`  ${t.padEnd(25)}: ${res[0].count} rows`);
  }

  console.log("\nDatabase reset complete! Ready for fresh account onboarding.");
}

main().catch(err => {
  console.error("Database reset failed:", err);
  process.exit(1);
});
