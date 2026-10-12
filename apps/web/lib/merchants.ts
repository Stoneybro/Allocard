import type { Hex } from "viem";

export type SponsorMerchantCategory = "rpc" | "security" | "indexing";

export type SponsorPlan = {
  id: string;
  name: string;
  priceAusd: number;
  cadence: "monthly" | "per_scan";
  description: string;
  features: string[];
  sampleCredential: string;
};

export type SponsorMerchant = {
  id: string;
  name: string;
  tagline: string;
  category: SponsorMerchantCategory;
  categoryLabel: string;
  merchantAddress: Hex;
  website: string;
  bountyTrack: string;
  plans: SponsorPlan[];
};

export const SPONSOR_MERCHANTS: SponsorMerchant[] = [
  {
    id: "chainstack",
    name: "Chainstack",
    tagline: "Enterprise Monad RPC & Node Infrastructure",
    category: "rpc",
    categoryLabel: "Dedicated Node & RPC",
    merchantAddress: "0x1010101010101010101010101010101010101011",
    website: "https://chainstack.com",
    bountyTrack: "Track 01 & Ecosystem Winner Sponsor",
    plans: [
      {
        id: "chainstack-dev",
        name: "Developer Monad Node",
        priceAusd: 50,
        cadence: "monthly",
        description: "500K daily requests, WebSocket support, 50 RPS burst cap.",
        features: ["Monad Testnet RPC", "Sub-second block streaming", "Basic SLA"],
        sampleCredential: "https://monad-testnet.chainstack.com/rpc/v1/allocard_dev_8f293b",
      },
      {
        id: "chainstack-pro",
        name: "Pro Dedicated RPC",
        priceAusd: 150,
        cadence: "monthly",
        description: "Unlimited requests, high-throughput dedicated endpoint, 99.9% uptime.",
        features: ["Dedicated compute unit", "Zero rate limits", "Priority mempool access"],
        sampleCredential: "https://monad-testnet.chainstack.com/rpc/v1/allocard_pro_4a810c",
      },
    ],
  },
  {
    id: "crouton",
    name: "Crouton Digital",
    tagline: "High-Throughput Unlimited RPC for Teams",
    category: "rpc",
    categoryLabel: "Dedicated Node & RPC",
    merchantAddress: "0x2020202020202020202020202020202020202022",
    website: "https://crouton.digital",
    bountyTrack: "Unlimited RPC Sponsor",
    plans: [
      {
        id: "crouton-highspeed",
        name: "High-Throughput RPC Stream",
        priceAusd: 120,
        cadence: "monthly",
        description: "Optimized for automated bot pipelines and fast indexing feeds.",
        features: ["Direct P2P peering", "Sub-50ms latency", "Dual endpoint failover"],
        sampleCredential: "https://monad.crouton.digital/ws/v2/live_feed_88291a",
      },
    ],
  },
  {
    id: "ack3",
    name: "Ack3 AI",
    tagline: "Smart Contract Automated Security Audits & Scans",
    category: "security",
    categoryLabel: "Security & Auditing",
    merchantAddress: "0x3030303030303030303030303030303030303033",
    website: "https://ack3.ai",
    bountyTrack: "$15,000 Security Scan Sponsor",
    plans: [
      {
        id: "ack3-vuln-scan",
        name: "Automated Vulnerability Scan",
        priceAusd: 100,
        cadence: "per_scan",
        description: "Pre-deployment bytecode & delegation caveat security audit.",
        features: ["Reentrancy & delegation checks", "Formal verification report", "PDF Certificate"],
        sampleCredential: "ACK3-AUDIT-JOB-2026-X992 (Verification Passed)",
      },
      {
        id: "ack3-full-audit",
        name: "Comprehensive Pre-Mainnet Audit",
        priceAusd: 250,
        cadence: "per_scan",
        description: "Deep static analysis, fuzzing, and compliance policy verification.",
        features: ["Full repository audit", "Automated bug bounty scanner", "Security Badge"],
        sampleCredential: "ACK3-CERT-SEC-MONAD-77401-VERIFIED",
      },
    ],
  },
  {
    id: "envio",
    name: "Envio",
    tagline: "HyperSync Real-Time Indexing for Monad",
    category: "indexing",
    categoryLabel: "Data & Indexing",
    merchantAddress: "0x4040404040404040404040404040404040404044",
    website: "https://envio.dev",
    bountyTrack: "Best Use of Envio ($1,000 + $5,000 Cloud Hosting)",
    plans: [
      {
        id: "envio-hypersync",
        name: "HyperSync Starter Cluster",
        priceAusd: 60,
        cadence: "monthly",
        description: "Index Monad transactions up to 1000x faster with GraphQL endpoint.",
        features: ["GraphQL API endpoint", "Custom event schemas", "Auto-reorg handling"],
        sampleCredential: "https://indexer.envio.dev/allocard_hypersync_monad_v1/graphql",
      },
    ],
  },
];

export function getSponsorMerchant(id: string): SponsorMerchant | undefined {
  return SPONSOR_MERCHANTS.find((m) => m.id === id);
}

export function getPlan(merchantId: string, planId: string): SponsorPlan | undefined {
  const m = getSponsorMerchant(merchantId);
  return m?.plans.find((p) => p.id === planId);
}
