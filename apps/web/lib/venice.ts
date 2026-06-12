/**
 * lib/venice.ts — Server-only Venice AI integration module
 *
 * Venice API is OpenAI-compatible. Base URL: https://api.venice.ai/api/v1
 * Auth: Authorization: Bearer $VENICE_API_KEY
 *
 * Models used:
 *   - Text / reasoning / policy:  mistral-small-3-2-24b-instruct
 *   - Vision / receipt verify:    qwen3-vl-235b-a22b
 *
 * All functions accept an optional `companyPolicy` — the company-wide expense
 * policy document. This is the single source of truth layered above:
 *   1. On-chain caveats (hard mathematical constraints)
 *   2. Company expense policy (natural language, company-wide)
 *   3. Delegation-specific additions (per-delegation overrides)
 */

import type { CompanyDelegationCaveat } from "@/app/actions/identity";

const VENICE_BASE_URL = "https://api.venice.ai/api/v1";
const TEXT_MODEL = "mistral-small-3-2-24b-instruct";
const VISION_MODEL = "qwen3-vl-235b-a22b";

function getApiKey(): string | null {
  return process.env.VENICE_API_KEY ?? null;
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

export type TravelPlan = {
  approved: boolean;
  reasoning: string;
  confidence: number;
  flightOption: string;
  hotelOption: string;
  estimatedTotalEth: string;
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
// Low-level Venice fetch helper
// ---------------------------------------------------------------------------

async function veniceChat<T>(params: {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  responseSchema: Record<string, unknown>;
}): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("VENICE_API_KEY is not configured");

  const body = {
    model: params.model,
    messages: params.messages,
    response_format: {
      type: "json_schema",
      json_schema: { name: "response", schema: params.responseSchema },
    },
    temperature: 0.2,
    max_tokens: 1024,
  };

  const res = await fetch(`${VENICE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Venice API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Venice returned an empty response");
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
      lines.push(`- Spend limit: ${eth} ETH maximum per delegation`);
    }
    if (c.caveatType === "nativeTokenPeriodTransfer") {
      const wei = BigInt(String(val.maxAmount ?? val.amount ?? "0"));
      const eth = (Number(wei) / 1e18).toFixed(6);
      const period = String(val.period ?? "period");
      lines.push(`- Period limit: ${eth} ETH per ${period}`);
    }
    if (c.caveatType === "allowedTargets") {
      const targets = Array.isArray(val.targets) ? (val.targets as string[]).join(", ") : String(val.targets ?? "");
      lines.push(`- Allowed payment targets: ${targets}`);
    }
    if (c.caveatType === "valueLte") {
      const wei = BigInt(String(val.maxValue ?? val.valueWei ?? "0"));
      const eth = (Number(wei) / 1e18).toFixed(6);
      lines.push(`- Per-transaction cap: ${eth} ETH`);
    }
    if (c.caveatType === "limitedCalls") {
      lines.push(`- Transaction call limit: ${String(val.limit ?? val.maxCalls ?? "1")}`);
    }
  }
  return lines.join("\n") || "- No specific limits configured";
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const POLICY_CHECK_SCHEMA = {
  type: "object",
  properties: {
    approved: { type: "boolean" },
    reasoning: { type: "string" },
    confidence: { type: "number" },
  },
  required: ["approved", "reasoning", "confidence"],
};

const RECEIPT_SCHEMA = {
  type: "object",
  properties: {
    verified: { type: "boolean" },
    reasoning: { type: "string" },
    confidence: { type: "number" },
    extractedAmount: { type: "string" },
    extractedMerchant: { type: "string" },
    extractedDate: { type: "string" },
  },
  required: ["verified", "reasoning", "confidence"],
};

const TRAVEL_SCHEMA = {
  type: "object",
  properties: {
    approved: { type: "boolean" },
    reasoning: { type: "string" },
    confidence: { type: "number" },
    flightOption: { type: "string" },
    hotelOption: { type: "string" },
    estimatedTotalEth: { type: "string" },
    merchantTargets: { type: "array", items: { type: "string" } },
  },
  required: ["approved", "reasoning", "confidence", "flightOption", "hotelOption", "estimatedTotalEth", "merchantTargets"],
};

const VENDOR_SCHEMA = {
  type: "object",
  properties: {
    approved: { type: "boolean" },
    reasoning: { type: "string" },
    confidence: { type: "number" },
    selectedVendor: { type: "string" },
    selectedPlan: { type: "string" },
    estimatedCostEth: { type: "string" },
    isDuplicate: { type: "boolean" },
    duplicateReason: { type: "string" },
    merchantTarget: { type: "string" },
  },
  required: ["approved", "reasoning", "confidence", "selectedVendor", "selectedPlan", "estimatedCostEth", "isDuplicate", "merchantTarget"],
};

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
Be strict about policy compliance. Approve only if the claim clearly falls within all constraints.`;

  const userPrompt = `${policy}

Employee reimbursement claim:
- Description: ${input.claimDescription}
- Amount requested: ${input.amountEth} ETH

Does this claim comply with the policy and limits? Respond in JSON.`;

  const fallback: PolicyCheckResult = {
    approved: false,
    reasoning: "Venice AI is not available (VENICE_API_KEY not configured). Claim auto-rejected for safety.",
    confidence: 0,
    prompt: userPrompt,
  };

  const apiKey = getApiKey();
  if (!apiKey) return fallback;

  try {
    const result = await veniceChat<{ approved: boolean; reasoning: string; confidence: number }>({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      responseSchema: POLICY_CHECK_SCHEMA,
    });
    return { ...result, prompt: userPrompt };
  } catch (err) {
    console.error("[venice] checkPolicy error:", err);
    return {
      approved: false,
      reasoning: `Venice check failed: ${err instanceof Error ? err.message : String(err)}`,
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

  const systemPrompt = `You are a policy compliance advisor for Allocard.
An employee is attempting a direct, manual on-chain spend from their delegated wallet.
Evaluate whether the stated purpose and amount comply with the company's approved delegation policy.
Return a JSON object with: approved (boolean), reasoning (string, 1-3 sentences advising the employee), confidence (number 0.0-1.0).
If the spend violates policy, set approved to false and explain why.`;

  const userPrompt = `${policy}

Employee intended spend:
- Purpose: ${input.purpose}
- Amount: ${input.amountEth} ETH

Does this intended spend comply with the policy and limits? Respond in JSON.`;

  const fallback: PolicyCheckResult = {
    approved: false,
    reasoning: "Venice AI is not available. This transaction will be flagged.",
    confidence: 0,
    prompt: userPrompt,
  };

  const apiKey = getApiKey();
  if (!apiKey) return fallback;

  try {
    const result = await veniceChat<{ approved: boolean; reasoning: string; confidence: number }>({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      responseSchema: POLICY_CHECK_SCHEMA,
    });
    return { ...result, prompt: userPrompt };
  } catch (err) {
    console.error("[venice] advisoryPolicyCheck error:", err);
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
    reasoning: "Venice Vision is not available (VENICE_API_KEY not configured).",
    confidence: 0,
  };

  const apiKey = getApiKey();
  if (!apiKey) return fallback;

  const systemPrompt = `You are a receipt verification assistant for Allocard corporate spend management.
Examine the receipt image and verify whether it matches the stated claim.
Extract the total amount, merchant name, and date if visible.
Return JSON with: verified (boolean), reasoning (string), confidence (number 0-1), extractedAmount (string), extractedMerchant (string), extractedDate (string).`;

  const userMessage = {
    role: "user",
    content: [
      { type: "text", text: `Claim details:\n- Description: ${input.claimDescription}\n- Amount: ${input.amountEth} ETH\n\nPlease verify this receipt matches the claim.` },
      { type: "image_url", image_url: { url: dataUri } },
    ],
  };

  try {
    const result = await veniceChat<Omit<ReceiptVerificationResult, "prompt"> & {
      reasoning: string; confidence: number; verified: boolean;
      extractedAmount?: string; extractedMerchant?: string; extractedDate?: string;
    }>({
      model: VISION_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        userMessage,
      ],
      responseSchema: RECEIPT_SCHEMA,
    });
    return result;
  } catch (err) {
    console.error("[venice] verifyReceipt error:", err);
    return {
      verified: false,
      reasoning: `Receipt verification failed: ${err instanceof Error ? err.message : String(err)}`,
      confidence: 0,
    };
  }
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
Research realistic travel options (you have knowledge of major airlines, hotel chains, and typical pricing) and select the best value options within budget.
Merchant targets should be example smart contract or wallet addresses for whitelisted merchants (use placeholder format: 0xTRAVEL_MERCHANT_1, 0xHOTEL_MERCHANT_1).
Return a structured JSON travel plan.`;

  const userPrompt = `Travel request:
- Destination: ${input.destination}
- Approximate dates: ${input.departureDateApprox} to ${input.returnDateApprox}
- Budget: ${input.budgetEth} ETH
${input.employeeDescription ? `- Notes: ${input.employeeDescription}` : ""}

${policy}

Select the best flight and hotel options within budget and policy. Estimate total cost in ETH (1 ETH ≈ $3000 for pricing reference). Return JSON.`;

  const fallback: TravelPlan = {
    approved: false,
    reasoning: "Venice AI not available. Travel booking requires AI research — cannot proceed without Venice API.",
    confidence: 0,
    flightOption: "Unavailable",
    hotelOption: "Unavailable",
    estimatedTotalEth: "0",
    merchantTargets: [],
    prompt: userPrompt,
  };

  const apiKey = getApiKey();
  if (!apiKey) return fallback;

  try {
    const result = await veniceChat<Omit<TravelPlan, "prompt">>({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      responseSchema: TRAVEL_SCHEMA,
    });
    return { ...result, prompt: userPrompt };
  } catch (err) {
    console.error("[venice] researchTravel error:", err);
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
You have broad knowledge of SaaS tools, their pricing, and feature sets.
IMPORTANT: Before recommending a purchase, check if the requested tool category overlaps with existing tools to avoid duplicate spend.
Merchant targets should use placeholder format: 0xVENDOR_MERCHANT_1.
Return structured JSON with your vendor recommendation.`;

  const userPrompt = `Procurement request:
- Tool category: ${input.toolCategory}
- Team size: ${input.teamSize} people
- Budget: ${input.budgetEth} ETH per month
${input.additionalRequirements ? `- Requirements: ${input.additionalRequirements}` : ""}

Existing tools already subscribed to:
${existingToolsList}

${policy}

Research the best vendor options. Check for duplicates. Select the best value option within budget and policy. Estimate monthly cost in ETH (1 ETH ≈ $3000). Return JSON.`;

  const fallback: VendorChoice = {
    approved: false,
    reasoning: "Venice AI not available. Vendor research requires AI — cannot proceed without Venice API.",
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
    const result = await veniceChat<Omit<VendorChoice, "prompt">>({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      responseSchema: VENDOR_SCHEMA,
    });
    return { ...result, prompt: userPrompt };
  } catch (err) {
    console.error("[venice] researchVendor error:", err);
    return { ...fallback, reasoning: `Vendor research failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
