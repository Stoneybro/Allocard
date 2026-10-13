/**
 * lib/ai.ts — Server-only Qwen AI integration module (Alibaba Cloud Model Studio)
 *
 * OpenAI-compatible endpoint: DASHSCOPE_BASE_URL
 * Auth: Authorization: Bearer $DASHSCOPE_API_KEY
 *
 * Models used:
 *   - Text / reasoning / policy:  qwen3.8-max
 *   - Vision / receipt verify:    qwen3-vl-plus
 *   - Vision / receipt extract:   qwen3-vl-plus
 *
 * All functions accept an optional `companyPolicy` — the company-wide expense
 * policy document. This is the single source of truth layered above:
 *   1. On-chain caveats (hard mathematical constraints)
 *   2. Company expense policy (natural language, company-wide)
 *   3. Delegation-specific additions (per-delegation overrides)
 */

import type { CompanyDelegationCaveat } from "@/app/actions/identity";
import { TOKEN_SYMBOL } from "@/lib/chain";

const DEFAULT_BASE_URL = "https://ws-hjdcclpedbb2egen.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1";
const TEXT_MODEL = "qwen3.8-max";
const VISION_MODEL = "qwen3-vl-plus";

function getBaseUrl(): string {
  return process.env.DASHSCOPE_BASE_URL || DEFAULT_BASE_URL;
}

function getApiKey(): string | null {
  return process.env.DASHSCOPE_API_KEY ?? null;
}

export type PolicyCheckResult = {
  approved: boolean;
  reasoning: string;
  confidence: number;
  prompt: string;
};

export type ReceiptVerificationResult = {
  verified: boolean;
  reasoning: string;
  confidence: number;
  extractedAmount?: string;
  extractedMerchant?: string;
  extractedDate?: string;
};

export type ReceiptExtractionResult = {
  merchant: string;
  date: string;
  totalUsd: string;
  estimatedEth: string;
  suggestedPurpose: string;
  lineItems: string[];
  confidence: number;
};

export type TravelPlan = {
  approved: boolean;
  reasoning: string;
  confidence: number;
  flight: {
    airline: string;
    flightNumber: string;
    time: string;
  };
  hotel: {
    name: string;
    nights: number;
  };
  estimatedCostEth: string;
  merchantTargets: string[];
  prompt: string;
};

export type VendorChoice = {
  approved: boolean;
  reasoning: string;
  confidence: number;
  selectedVendor: string;
  selectedPlan: string;
  estimatedCostEth: string;
  isDuplicate: boolean;
  duplicateReason?: string;
  merchantTarget: string;
  prompt: string;
};

// ---------------------------------------------------------------------------
// Low-level Qwen fetch helper
// ---------------------------------------------------------------------------

async function qwenChat<T>(params: {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  responseSchema?: Record<string, unknown>;
  disableJsonSchema?: boolean;
}): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY is not configured");

  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    temperature: 0.2,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  };

  const res = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[qwenChat] API Error ${res.status}:`, text);
    throw new Error(`Qwen API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  let content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Qwen returned an empty response");

  // Clean markdown backticks if the model returned them instead of raw JSON
  content = content.replace(/^```(json)?\s*/i, "").replace(/```$/, "").trim();

  return JSON.parse(content) as T;
}

// ---------------------------------------------------------------------------
// Shared policy builder
// ---------------------------------------------------------------------------

function buildPolicyBlock(input: {
  caveats: CompanyDelegationCaveat[];
  companyPolicy?: string | null;
  policyPrompt?: string | null;
}): string {
  const parts: string[] = [];

  // Layer 1: On-chain caveats (hard limits)
  parts.push("Company On-Chain Spending Limits:");
  parts.push(caveatSummary(input.caveats));

  // Layer 2: Company-wide expense policy
  if (input.companyPolicy) {
    parts.push("\nCompany Expense Policy:");
    parts.push(input.companyPolicy);
  }

  // Layer 3: Delegation-specific additions
  if (input.policyPrompt) {
    parts.push("\nDelegation-Specific Additions:");
    parts.push(input.policyPrompt);
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Caveat summary builder
// ---------------------------------------------------------------------------

function caveatSummary(caveats: CompanyDelegationCaveat[]): string {
  const lines: string[] = [];
  for (const c of caveats) {
    const val = c.caveatValue as Record<string, unknown>;
    if (c.caveatType === "nativeTokenTransferAmount") {
      const wei = BigInt(String(val.maxAmount ?? val.amount ?? "0"));
      const eth = (Number(wei) / 1e18).toFixed(6);
      lines.push(`- Spend limit: ${eth} ${TOKEN_SYMBOL} maximum per delegation`);
    }
    if (c.caveatType === "nativeTokenPeriodTransfer") {
      const wei = BigInt(String(val.maxAmount ?? val.amount ?? "0"));
      const eth = (Number(wei) / 1e18).toFixed(6);
      const period = String(val.period ?? "period");
      lines.push(`- Period limit: ${eth} ${TOKEN_SYMBOL} per ${period}`);
    }
    if (c.caveatType === "allowedTargets") {
      const targets = Array.isArray(val.targets) ? (val.targets as string[]).join(", ") : String(val.targets ?? "");
      lines.push(`- Allowed payment targets: ${targets}`);
    }
    if (c.caveatType === "valueLte") {
      const wei = BigInt(String(val.maxValue ?? val.valueWei ?? "0"));
      const eth = (Number(wei) / 1e18).toFixed(6);
      lines.push(`- Per-transaction cap: ${eth} ${TOKEN_SYMBOL}`);
    }
    if (c.caveatType === "limitedCalls") {
      lines.push(`- Transaction call limit: ${String(val.limit ?? val.maxCalls ?? "1")}`);
    }
  }
  return lines.join("\n") || "- No specific limits configured";
}

// ---------------------------------------------------------------------------
// 1. checkPolicy — Reimbursement Agent policy check
// ---------------------------------------------------------------------------

export async function checkPolicy(input: {
  claimDescription: string;
  amountEth: string;
  caveats: CompanyDelegationCaveat[];
  policyPrompt?: string | null;
  companyPolicy?: string | null;
  agentName?: string;
}): Promise<PolicyCheckResult> {
  const policy = buildPolicyBlock(input);
  const agentLabel = input.agentName ?? "Reimbursement Agent";

  const systemPrompt = `You are the ${agentLabel} for Allocard, a corporate spend management platform.
Your task is to evaluate whether an employee's reimbursement claim complies with the company's approved delegation policy.
Return a JSON object with: approved (boolean), reasoning (string, 1-3 sentences), confidence (number 0.0-1.0).
Be strict about policy compliance. Approve only if the claim clearly falls within all constraints.

CRITICAL RULES:
1. CURRENCY EQUIVALENCE: ${TOKEN_SYMBOL} (Agora Digital Dollar) is pegged 1:1 with USD ($). 1 ${TOKEN_SYMBOL} = $1.00 USD. All limits, receipts, and claims in USD or ${TOKEN_SYMBOL} are 1:1 equivalent.
2. BUSINESS JUSTIFICATION: You MUST reject any claim that lacks a clear, explicit business justification (e.g., general "coffee", "lunch", "uber", or "supplies" without stating the corporate purpose like "client meeting" or "travel to conference"). Personal expenses or vague claims are strictly prohibited.
3. NUMERIC COMPARISON: When comparing numeric limits and amounts, evaluate them mathematically as numbers. Do not reject claims for formatting or decimal differences.
4. TONE: Do not use em-dashes in your reasoning.`;

  const userPrompt = `${policy}

Employee reimbursement claim:
- Description: ${input.claimDescription}
- Amount requested: ${input.amountEth} ${TOKEN_SYMBOL} (equivalent to $${input.amountEth} USD)

Does this claim comply with the policy and limits? Respond in valid JSON with { approved: boolean, reasoning: string, confidence: number }.`;

  const fallback: PolicyCheckResult = {
    approved: false,
    reasoning: "AI is not available (DASHSCOPE_API_KEY not configured). Claim auto-rejected for safety.",
    confidence: 0,
    prompt: userPrompt,
  };

  const apiKey = getApiKey();
  if (!apiKey) return fallback;

  try {
    const result = await qwenChat<{ approved: boolean; reasoning: string; confidence: number }>({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return { ...result, prompt: userPrompt };
  } catch (err) {
    console.error("[qwen] checkPolicy error:", err);
    return {
      approved: false,
      reasoning: `AI policy check failed: ${err instanceof Error ? err.message : String(err)}`,
      confidence: 0,
      prompt: userPrompt,
    };
  }
}

// ---------------------------------------------------------------------------
// 1b. advisoryPolicyCheck — Employee Manual Spend Pre-check
// ---------------------------------------------------------------------------

export async function advisoryPolicyCheck(input: {
  purpose: string;
  amountEth: string;
  caveats: CompanyDelegationCaveat[];
  policyPrompt?: string | null;
  companyPolicy?: string | null;
}): Promise<PolicyCheckResult> {
  const policy = buildPolicyBlock(input);

  const systemPrompt = `You are a strict policy compliance advisor for Allocard corporate spend management.
An employee is attempting a direct, manual on-chain spend from their delegated wallet.
Evaluate whether the stated purpose and amount comply with the company's approved delegation policy AND general corporate spending standards.

CRITICAL RULES:
1. CURRENCY EQUIVALENCE: ${TOKEN_SYMBOL} (Agora Digital Dollar) is pegged 1:1 with USD ($). 1 ${TOKEN_SYMBOL} = $1.00 USD.
2. ALL expenses MUST be strictly for legitimate, provable business purposes.
3. Vague or obviously personal expenses (e.g., "coffee", "lunch", "ice cream", "snacks") MUST be REJECTED unless accompanied by a clear, explicit business justification (e.g., "lunch with client X").
4. Do not assume business context if none is provided.
5. TONE: Do not use em-dashes in your reasoning.

Return a JSON object with: approved (boolean), reasoning (string, 1-3 sentences advising the employee), confidence (number 0.0-1.0).
If the spend violates policy or lacks business context, set approved to false and explain why.`;

  const userPrompt = `${policy}

Employee intended spend:
- Purpose: ${input.purpose}
- Amount: ${input.amountEth} ${TOKEN_SYMBOL} (equivalent to $${input.amountEth} USD)

Does this intended spend comply with the policy and limits? Respond in valid JSON with { approved: boolean, reasoning: string, confidence: number }.`;

  const fallback: PolicyCheckResult = {
    approved: false,
    reasoning: "AI is not available. This transaction will be flagged.",
    confidence: 0,
    prompt: userPrompt,
  };

  const apiKey = getApiKey();
  if (!apiKey) return fallback;

  try {
    const result = await qwenChat<{ approved: boolean; reasoning: string; confidence: number }>({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return { ...result, prompt: userPrompt };
  } catch (err) {
    console.error("[qwen] advisoryPolicyCheck error:", err);
    return {
      approved: false,
      reasoning: `Advisory check failed: ${err instanceof Error ? err.message : String(err)}`,
      confidence: 0,
      prompt: userPrompt,
    };
  }
}

// ---------------------------------------------------------------------------
// 2. verifyReceipt — Vision-based receipt verification
// ---------------------------------------------------------------------------

export async function verifyReceipt(input: {
  imageBase64: string;
  mimeType?: string;
  claimDescription: string;
  amountEth: string;
}): Promise<ReceiptVerificationResult> {
  const mimeType = input.mimeType ?? "image/jpeg";
  const dataUri = input.imageBase64.startsWith("data:")
    ? input.imageBase64
    : `data:${mimeType};base64,${input.imageBase64}`;

  const fallback: ReceiptVerificationResult = {
    verified: false,
    reasoning: "Receipt Vision is not available (DASHSCOPE_API_KEY not configured).",
    confidence: 0,
  };

  const apiKey = getApiKey();
  if (!apiKey) return fallback;

  const systemPrompt = `You are a receipt verification assistant for Allocard corporate spend management.
Examine the receipt image and verify whether it matches the stated claim.
Extract the total amount, merchant name, and date if visible.

CRITICAL CURRENCY & VERIFICATION RULES:
1. CURRENCY EQUIVALENCE: Allocard operates with ${TOKEN_SYMBOL} (Agora Digital Dollar), which is pegged 1:1 with USD ($). 1 ${TOKEN_SYMBOL} = $1.00 USD.
2. Standard commercial receipts are denominated in USD ($) or local fiat currency. A receipt showing "$" or "USD" matches a claim in ${TOKEN_SYMBOL} at a 1:1 ratio. You MUST NEVER reject a claim because the receipt is in USD ($) while the claim is in ${TOKEN_SYMBOL}. Treat $46.87 USD and 46.87 ${TOKEN_SYMBOL} as completely identical in value.
3. NUMERIC COMPARISON: Evaluate amounts mathematically as numbers. Do NOT reject claims just because of formatting differences, currency symbols, or decimal places (e.g., $100, $100.00, and 100 ${TOKEN_SYMBOL} are all identical).
4. TONE: Do not use em-dashes in your reasoning.

Return JSON with:
- verified (boolean): true if the receipt proves the expense matches the claim description and amount, false otherwise.
- reasoning (string): clear 1-2 sentence explanation without em-dashes.
- confidence (number 0-1)
- extractedAmount (string)
- extractedMerchant (string)
- extractedDate (string)`;

  const userMessage = {
    role: "user",
    content: [
      {
        type: "text",
        text: `Claim details:\n- Description: ${input.claimDescription}\n- Amount: ${input.amountEth} ${TOKEN_SYMBOL} ($${input.amountEth} USD)\n\nPlease verify this receipt matches the claim. Note: ${TOKEN_SYMBOL} is pegged 1:1 to USD ($), so dollar signs on receipts match ${TOKEN_SYMBOL} exactly. Respond in JSON.`,
      },
      { type: "image_url", image_url: { url: dataUri } },
    ],
  };

  try {
    const result = await qwenChat<{
      verified: boolean;
      reasoning: string;
      confidence: number;
      extractedAmount?: string;
      extractedMerchant?: string;
      extractedDate?: string;
    }>({
      model: VISION_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        userMessage,
      ],
    });
    return result;
  } catch (err) {
    console.error("[qwen] verifyReceipt error:", err);
    return {
      verified: false,
      reasoning: `Receipt verification failed: ${err instanceof Error ? err.message : String(err)}`,
      confidence: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// 2b. extractReceiptData — Vision-based receipt extraction (no prior knowledge)
// ---------------------------------------------------------------------------

export async function extractReceiptData(input: {
  imageBase64: string;
  mimeType?: string;
}): Promise<ReceiptExtractionResult> {
  const mimeType = input.mimeType ?? "image/jpeg";
  const dataUri = input.imageBase64.startsWith("data:")
    ? input.imageBase64
    : `data:${mimeType};base64,${input.imageBase64}`;

  const apiKey = getApiKey();
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY is not configured");

  const systemPrompt = `You are a smart receipt extraction assistant for a corporate expense management platform.
Analyze the receipt image and extract the following fields in valid JSON:
- merchant: The name of the store, restaurant, or vendor
- date: The date of the purchase (format: YYYY-MM-DD or best guess)
- totalUsd: The final total amount in USD as a plain decimal string (e.g. "12.50"). If the currency is not USD, convert to USD.
- estimatedEth: Convert the USD total to ${TOKEN_SYMBOL} assuming 1 ${TOKEN_SYMBOL} = 1.00 USD (Agora digital dollar stablecoin). Return as a decimal string with up to 2 decimal places (e.g. "12.50").
- suggestedPurpose: A literal and factual description of what was actually purchased based ONLY on the items in the receipt (e.g. "Playstation 5 and games", "Coffee and pastries for client meetings"). Do NOT invent or hallucinate a corporate business purpose if it is not explicitly stated.
- lineItems: An array of item descriptions from the receipt (max 5 items, omit tax/tip lines).
- confidence: A number 0-1 representing how confident you are in the extraction.

Return ONLY valid JSON. Do not use markdown code blocks.`;

  const userMessage = {
    role: "user",
    content: [
      { type: "text", text: "Please extract the expense details from this receipt in JSON." },
      { type: "image_url", image_url: { url: dataUri } },
    ],
  };

  const result = await qwenChat<ReceiptExtractionResult>({
    model: VISION_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      userMessage,
    ],
  });

  return result;
}

// ---------------------------------------------------------------------------
// 3. researchTravel — Travel Agent: research + select options
// ---------------------------------------------------------------------------

export async function researchTravel(input: {
  destination: string;
  departureDateApprox: string;
  returnDateApprox: string;
  budgetEth: string;
  caveats: CompanyDelegationCaveat[];
  policyPrompt?: string | null;
  companyPolicy?: string | null;
  employeeDescription?: string;
}): Promise<TravelPlan> {
  const policy = buildPolicyBlock(input);

  const systemPrompt = `You are the Allocard Travel Agent — an AI that books business travel within a company's approved delegation policy.
The budget provided is the REMAINING balance available — not the original allocation. You MUST propose options whose estimated total cost fits within this remaining budget.
If no options fit within the remaining budget, you MUST reject the request with approved=false and explain that the remaining balance is insufficient.
Research realistic travel options (you have knowledge of major airlines, hotel chains, and typical pricing) and select the best value options within budget.
Merchant targets should be example smart contract or wallet addresses for whitelisted merchants (use placeholder format: 0xTRAVEL_MERCHANT_1, 0xHOTEL_MERCHANT_1).
Return a structured JSON travel plan.`;

  const userPrompt = `Travel request:
- Destination: ${input.destination}
- Approximate dates: ${input.departureDateApprox} to ${input.returnDateApprox}
- Remaining Budget: ${input.budgetEth} ${TOKEN_SYMBOL}
${input.employeeDescription ? `- Notes: ${input.employeeDescription}` : ""}

${policy}

Select the best flight and hotel options that fit within the remaining budget and policy. You MUST reject (approved=false) if the total estimated cost exceeds the remaining budget. Estimate total cost in ${TOKEN_SYMBOL} (1 ${TOKEN_SYMBOL} = $1.00 USD for pricing reference). Return valid JSON.`;

  const fallback: TravelPlan = {
    approved: false,
    reasoning: "AI not available. Travel booking requires AI research.",
    confidence: 0,
    flight: {
      airline: "Unavailable",
      flightNumber: "N/A",
      time: "N/A",
    },
    hotel: {
      name: "Unavailable",
      nights: 0,
    },
    estimatedCostEth: "0",
    merchantTargets: [],
    prompt: userPrompt,
  };

  const apiKey = getApiKey();
  if (!apiKey) return fallback;

  try {
    const result = await qwenChat<Omit<TravelPlan, "prompt">>({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return { ...result, prompt: userPrompt };
  } catch (err) {
    console.error("[qwen] researchTravel error:", err);
    return { ...fallback, reasoning: `Travel research failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ---------------------------------------------------------------------------
// 4. researchVendor — Procurement Agent: vendor research + selection
// ---------------------------------------------------------------------------

export async function researchVendor(input: {
  toolCategory: string;
  teamSize: number;
  budgetEth: string;
  caveats: CompanyDelegationCaveat[];
  policyPrompt?: string | null;
  companyPolicy?: string | null;
  existingTools?: string[];
  additionalRequirements?: string;
}): Promise<VendorChoice> {
  const policy = buildPolicyBlock(input);
  const existingToolsList = input.existingTools?.length ? input.existingTools.join(", ") : "None provided";

  const systemPrompt = `You are the Allocard Procurement Agent — an AI that researches and selects software tools and vendor subscriptions for corporate teams.
The budget provided is the REMAINING balance available — not the original allocation. You MUST propose options whose estimated monthly cost fits within this remaining budget.
If no options fit within the remaining budget, you MUST reject the request with approved=false and explain that the remaining balance is insufficient.
You have broad knowledge of SaaS tools, their pricing, and feature sets.
IMPORTANT: Before recommending a purchase, check if the requested tool category overlaps with existing tools to avoid duplicate spend.
Merchant targets should use placeholder format: 0xVENDOR_MERCHANT_1.
Return structured JSON with your vendor recommendation.`;

  const userPrompt = `Procurement request:
- Tool category: ${input.toolCategory}
- Team size: ${input.teamSize} people
- Remaining Budget: ${input.budgetEth} ${TOKEN_SYMBOL} per month
${input.additionalRequirements ? `- Requirements: ${input.additionalRequirements}` : ""}

Existing tools already subscribed to:
${existingToolsList}

${policy}

Research the best vendor options. Check for duplicates. Select the best value option that fits within the remaining budget and policy. You MUST reject (approved=false) if the estimated monthly cost exceeds the remaining budget. Estimate monthly cost in ${TOKEN_SYMBOL} (1 ${TOKEN_SYMBOL} = $1.00 USD). Return valid JSON.`;

  const fallback: VendorChoice = {
    approved: false,
    reasoning: "AI not available. Vendor research requires AI.",
    confidence: 0,
    selectedVendor: "Unavailable",
    selectedPlan: "Unavailable",
    estimatedCostEth: "0",
    isDuplicate: false,
    merchantTarget: "0x0000000000000000000000000000000000000000",
    prompt: userPrompt,
  };

  const apiKey = getApiKey();
  if (!apiKey) return fallback;

  try {
    const result = await qwenChat<Omit<VendorChoice, "prompt">>({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return { ...result, prompt: userPrompt };
  } catch (err) {
    console.error("[qwen] researchVendor error:", err);
    return { ...fallback, reasoning: `Vendor research failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ---------------------------------------------------------------------------
// 5. researchDevOpsProcurement — Scour Monad Ecosystem Sponsors for best plan
// ---------------------------------------------------------------------------

export type DevOpsRecommendation = {
  approved: boolean;
  recommendedMerchantId: string;
  recommendedPlanId: string;
  headline: string;
  reasoning: string;
  alternativesCompared: Array<{
    merchantName: string;
    planName: string;
    priceAusd: number;
    reasonNotChosen: string;
  }>;
  confidence: number;
  estimatedPriceAusd: number;
  prompt: string;
};

export async function researchDevOpsProcurement(input: {
  prompt: string;
  budgetAusd: number;
  targetBudgetAusd?: number | null;
  caveats?: CompanyDelegationCaveat[];
  companyPolicy?: string | null;
}): Promise<DevOpsRecommendation> {
  const { SPONSOR_MERCHANTS, getSponsorMerchant, getPlan } = await import("@/lib/merchants");

  const catalogSummary = SPONSOR_MERCHANTS.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    categoryLabel: m.categoryLabel,
    tagline: m.tagline,
    plans: m.plans.map((p) => ({
      id: p.id,
      name: p.name,
      priceAusd: p.priceAusd,
      cadence: p.cadence,
      description: p.description,
      features: p.features,
    })),
  }));

  const userReq = input.prompt.trim() || "Dedicated Monad RPC endpoint with high throughput";
  const effectiveMax = input.targetBudgetAusd && input.targetBudgetAusd > 0
    ? Math.min(input.targetBudgetAusd, input.budgetAusd)
    : input.budgetAusd;

  // Robust deterministic fallback
  const fallback = (): DevOpsRecommendation => {
    const lower = userReq.toLowerCase();
    let bestMerchantId = "chainstack";
    let bestPlanId = "chainstack-dev";
    let headline = "Recommended: Chainstack Developer Monad Node";
    let reasoning = "Matches your Monad RPC requirements with WebSocket streaming and high reliability within your budget allowance.";
    const alternatives: Array<{ merchantName: string; planName: string; priceAusd: number; reasonNotChosen: string }> = [];

    if (lower.includes("security") || lower.includes("audit") || lower.includes("reentrancy") || lower.includes("vulnerability") || lower.includes("scan")) {
      if (effectiveMax >= 250 && (lower.includes("full") || lower.includes("comprehensive") || lower.includes("deep"))) {
        bestMerchantId = "ack3";
        bestPlanId = "ack3-full-audit";
        headline = "Recommended: Ack3 Comprehensive Security Audit";
        reasoning = "Provides deep static analysis, formal bytecode verification, and compliance certification for mission-critical deployments.";
        alternatives.push({
          merchantName: "Ack3 AI",
          planName: "Automated Vulnerability Scan",
          priceAusd: 100,
          reasonNotChosen: "Standard scan does not include full repository fuzzing and manual review certification.",
        });
      } else {
        bestMerchantId = "ack3";
        bestPlanId = "ack3-vuln-scan";
        headline = "Recommended: Ack3 Automated Vulnerability Scan";
        reasoning = "Performs automated pre-deployment security scanning and delegation caveat checks within your budget.";
        alternatives.push({
          merchantName: "Ack3 AI",
          planName: "Comprehensive Pre-Mainnet Audit",
          priceAusd: 250,
          reasonNotChosen: "Higher price point exceeds your target budget allocation.",
        });
      }
    } else if (lower.includes("index") || lower.includes("graphql") || lower.includes("hypersync") || lower.includes("event") || lower.includes("subgraph")) {
      bestMerchantId = "envio";
      bestPlanId = "envio-hypersync";
      headline = "Recommended: Envio HyperSync Starter Cluster";
      reasoning = "Indexes Monad blocks and contract events up to 1000x faster than standard RPCs with a dedicated GraphQL endpoint.";
      alternatives.push({
        merchantName: "Chainstack",
        planName: "Developer Monad Node",
        priceAusd: 50,
        reasonNotChosen: "Standard RPC node does not provide automated event schema querying or custom GraphQL APIs.",
      });
    } else if (lower.includes("throughput") || lower.includes("bot") || lower.includes("streaming") || lower.includes("peering") || lower.includes("unlimited")) {
      if (effectiveMax >= 120) {
        bestMerchantId = "crouton";
        bestPlanId = "crouton-highspeed";
        headline = "Recommended: Crouton Digital High-Throughput RPC Stream";
        reasoning = "Direct P2P peering and sub-50ms latency stream designed specifically for automated trading pipelines and high-volume requests.";
        alternatives.push({
          merchantName: "Chainstack",
          planName: "Developer Monad Node",
          priceAusd: 50,
          reasonNotChosen: "Standard node has a 50 RPS burst cap, which may bottleneck high-frequency streaming.",
        });
      } else {
        bestMerchantId = "chainstack";
        bestPlanId = "chainstack-dev";
        headline = "Recommended: Chainstack Developer Monad Node";
        reasoning = "Solid entrypoint with 500K daily requests and WebSocket support fitting cleanly under your budget limit.";
      }
    } else {
      if (effectiveMax >= 150 && (lower.includes("pro") || lower.includes("production") || lower.includes("dedicated"))) {
        bestMerchantId = "chainstack";
        bestPlanId = "chainstack-pro";
        headline = "Recommended: Chainstack Pro Dedicated RPC";
        reasoning = "Dedicated compute unit with zero rate limits and priority Monad mempool routing.";
        alternatives.push({
          merchantName: "Chainstack",
          planName: "Developer Monad Node",
          priceAusd: 50,
          reasonNotChosen: "Shared burst cap limits potential production scale.",
        });
      } else {
        bestMerchantId = "chainstack";
        bestPlanId = "chainstack-dev";
        headline = "Recommended: Chainstack Developer Monad Node";
        reasoning = "Best value option offering 500K daily requests, WebSocket streaming, and sub-second block streaming.";
        alternatives.push({
          merchantName: "Crouton Digital",
          planName: "High-Throughput RPC Stream",
          priceAusd: 120,
          reasonNotChosen: "Priced higher than required for standard testing and development workloads.",
        });
      }
    }

    const planObj = getPlan(bestMerchantId, bestPlanId);
    return {
      approved: true,
      recommendedMerchantId: bestMerchantId,
      recommendedPlanId: bestPlanId,
      headline,
      reasoning,
      alternativesCompared: alternatives,
      confidence: 0.92,
      estimatedPriceAusd: planObj?.priceAusd || 50,
      prompt: userReq,
    };
  };

  const apiKey = getApiKey();
  if (!apiKey) {
    return fallback();
  }

  const systemPrompt = `You are the Allocard Autonomous Cloud & Tooling Agent on Monad.
Your task is to analyze an engineering team's cloud infrastructure, RPC, security, or developer tooling requirements and scour the available Monad ecosystem sponsors (Chainstack, Crouton Digital, Ack3 AI, Envio) to recommend the best plan for their technical needs and budget.

Available Sponsor Catalog:
${JSON.stringify(catalogSummary, null, 2)}

Budget Constraints:
- Remaining Delegated Allowance: ${input.budgetAusd} AUSD
- Target Price: ${input.targetBudgetAusd ? `${input.targetBudgetAusd} AUSD` : "Flexible within allowance"}

Rules:
1. The selected plan's priceAusd MUST NOT exceed the remaining delegated allowance (${input.budgetAusd} AUSD).
2. If target price is specified, prioritize options closest to or below target price while fulfilling requirements.
3. Select the best matching merchant and plan.
4. Give a concise headline (e.g. "Recommended: Chainstack Developer Monad Node ($50 AUSD)").
5. Provide detailed technical reasoning explaining why this plan satisfies the user's requirements.
6. Compare 1-2 alternatives that were considered and explain why they were not selected (alternativesCompared).
7. Return ONLY valid JSON matching this schema:
{
  "approved": boolean,
  "recommendedMerchantId": string,
  "recommendedPlanId": string,
  "headline": string,
  "reasoning": string,
  "alternativesCompared": [
    {
      "merchantName": string,
      "planName": string,
      "priceAusd": number,
      "reasonNotChosen": string
    }
  ],
  "confidence": number,
  "estimatedPriceAusd": number
}`;

  try {
    const result = await qwenChat<Omit<DevOpsRecommendation, "prompt">>({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Engineering Request: ${userReq}` },
      ],
    });

    // Validate that merchant and plan actually exist in our catalog
    const verifiedPlan = getPlan(result.recommendedMerchantId, result.recommendedPlanId);
    if (!verifiedPlan) {
      return fallback();
    }

    return {
      ...result,
      prompt: userReq,
      estimatedPriceAusd: verifiedPlan.priceAusd,
    };
  } catch (err) {
    console.error("[qwen] researchDevOpsProcurement error, using fallback:", err);
    return fallback();
  }
}
