/**
 * lib/venice.ts — Server-only Venice AI integration module
 *
 * Venice API is OpenAI-compatible. Base URL: https://api.venice.ai/api/v1
 * Auth: Authorization: Bearer $VENICE_API_KEY
 *
 * Models used:
 *   - Text / reasoning / policy:  llama-3.3-70b   (response_format JSON schema)
 *   - Vision / receipt verify:    qwen3-vl-235b-a22b (base64 image data URI)
 *
 * All functions return a structured result. When VENICE_API_KEY is missing,
 * functions return a safe fallback so the app never crashes in dev.
 */

import type { CompanyDelegationCaveat } from "@/app/actions/identity";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const VENICE_BASE_URL = "https://api.venice.ai/api/v1";
// Verified live: supportsResponseSchema, non-reasoning (no thinking overhead), fp8
const TEXT_MODEL = "mistral-small-3-2-24b-instruct";
// Verified live: supportsVision + supportsResponseSchema, non-reasoning, fp8
const VISION_MODEL = "qwen3-vl-235b-a22b";

function getApiKey(): string | null {
  return process.env.VENICE_API_KEY ?? null;
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type PolicyCheckResult = {
  approved: boolean;
  reasoning: string;
  confidence: number;
  /** The full prompt sent — stored in claim_redemptions.venice_prompt for audit */
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
  if (!apiKey) {
    throw new Error("VENICE_API_KEY is not configured");
  }

  const body = {
    model: params.model,
    messages: params.messages,
    // Venice structured output — avoids function-calling overhead.
    // NOTE: do NOT use strict:true — Venice doesn't support OpenAI strict mode.
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "response",
        schema: params.responseSchema,
      },
    },
    temperature: 0.2,
    max_tokens: 1024,
  };

  const res = await fetch(`${VENICE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Venice API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Venice returned an empty response");
  }

  return JSON.parse(content) as T;
}

// ---------------------------------------------------------------------------
// Caveat summary builder — converts DB caveats to human-readable policy text
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
      const targets = Array.isArray(val.targets)
        ? (val.targets as string[]).join(", ")
        : String(val.targets ?? "");
      lines.push(`- Allowed payment targets: ${targets}`);
    }

    if (c.caveatType === "limitedCalls") {
      lines.push(`- Maximum ${String(val.count ?? val.limit ?? "?")} transactions allowed`);
    }

    if (c.caveatType === "valueLte") {
      const wei = BigInt(String(val.value ?? "0"));
      const eth = (Number(wei) / 1e18).toFixed(6);
      lines.push(`- Per-transaction cap: ${eth} ETH`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : "- No specific spending constraints configured";
}

// ---------------------------------------------------------------------------
// 1. checkPolicy — Reimbursement Agent policy check (text)
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

/**
 * Ask Venice whether a reimbursement claim is within the company's delegation
 * policy. Used by the Reimbursement Agent before executing an on-chain transfer.
 */
export async function checkPolicy(input: {
  claimDescription: string;
  amountEth: string;
  caveats: CompanyDelegationCaveat[];
  policyPrompt?: string | null;
  agentName?: string;
}): Promise<PolicyCheckResult> {
  const policy = caveatSummary(input.caveats);
  const agentLabel = input.agentName ?? "Reimbursement Agent";

  const systemPrompt = `You are the ${agentLabel} for Allocard, a corporate spend management platform.
Your task is to evaluate whether an employee's reimbursement claim complies with the company's approved delegation policy.
Return a JSON object with: approved (boolean), reasoning (string, 1-3 sentences), confidence (number 0.0-1.0).
Be strict about policy compliance. Approve only if the claim clearly falls within all constraints.`;

  const customPolicyBlock = input.policyPrompt
    ? `\nCompany Custom AI Policy:\n${input.policyPrompt}\n`
    : "";

  const userPrompt = `Company On-Chain Spending Limits:
${policy}
${customPolicyBlock}
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

/**
 * Perform a pre-check on an employee's intended manual spend to advise if it
 * complies with the company policy. This is an advisory check; employees can
 * still proceed, but it will be flagged for employer review.
 */
export async function advisoryPolicyCheck(input: {
  purpose: string;
  amountEth: string;
  caveats: CompanyDelegationCaveat[];
  policyPrompt?: string | null;
}): Promise<PolicyCheckResult> {
  const policy = caveatSummary(input.caveats);

  const systemPrompt = `You are a policy compliance advisor for Allocard.
An employee is attempting a direct, manual on-chain spend from their delegated wallet.
Evaluate whether the stated purpose and amount comply with the company's approved delegation policy.
Return a JSON object with: approved (boolean), reasoning (string, 1-3 sentences advising the employee), confidence (number 0.0-1.0).
If the spend violates policy, set approved to false and explain why.`;

  const customPolicyBlock = input.policyPrompt
    ? `\nCompany Custom AI Policy:\n${input.policyPrompt}\n`
    : "";

  const userPrompt = `Company On-Chain Spending Limits:
${policy}
${customPolicyBlock}
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

/**
 * Use Venice vision to verify a receipt image against a claim.
 * Images are passed as base64 data URIs — no separate upload step needed.
 */
export async function verifyReceipt(input: {
  /** Base64-encoded image (no data URI prefix needed — we add it). */
  imageBase64: string;
  /** MIME type of the image, e.g. "image/jpeg" */
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
      {
        type: "text",
        text: `Claim details:\n- Description: ${input.claimDescription}\n- Amount: ${input.amountEth} ETH\n\nPlease verify this receipt matches the claim.`,
      },
      {
        type: "image_url",
        image_url: { url: dataUri },
      },
    ],
  };

  try {
    const result = await veniceChat<ReceiptVerificationResult>({
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
      reasoning: `Venice vision check failed: ${err instanceof Error ? err.message : String(err)}`,
      confidence: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// 3. researchTravel — Travel Agent: research + select options (text)
// ---------------------------------------------------------------------------

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

/**
 * Research and select the best travel options within the delegation policy.
 * Returns a structured travel plan that the Travel Agent uses to execute bookings.
 */
export async function researchTravel(input: {
  destination: string;
  departureDateApprox: string;
  returnDateApprox: string;
  budgetEth: string;
  caveats: CompanyDelegationCaveat[];
  employeeDescription?: string;
}): Promise<TravelPlan> {
  const policy = caveatSummary(input.caveats);

  const systemPrompt = `You are the Allocard Travel Agent — an AI that books business travel within a company's approved delegation policy.
Research realistic travel options (you have knowledge of major airlines, hotel chains, and typical pricing) and select the best value options within budget.
Merchant targets should be example smart contract or wallet addresses for whitelisted merchants (use placeholder format: 0xTRAVEL_MERCHANT_1, 0xHOTEL_MERCHANT_1).
Return a structured JSON travel plan.`;

  const userPrompt = `Travel request:
- Destination: ${input.destination}
- Approximate dates: ${input.departureDateApprox} to ${input.returnDateApprox}
- Budget: ${input.budgetEth} ETH
${input.employeeDescription ? `- Notes: ${input.employeeDescription}` : ""}

Company delegation policy:
${policy}

Select the best flight and hotel options within budget. Estimate total cost in ETH (1 ETH ≈ $3000 for pricing reference). Return JSON.`;

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
    return {
      ...fallback,
      reasoning: `Travel research failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// 4. researchVendor — Procurement Agent: vendor research + selection (text)
// ---------------------------------------------------------------------------

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

/**
 * Research vendors for a procurement request and check for duplicate subscriptions.
 * Returns a vendor choice that the Procurement Agent uses to execute a subscription payment.
 */
export async function researchVendor(input: {
  toolCategory: string;
  teamSize: number;
  budgetEth: string;
  caveats: CompanyDelegationCaveat[];
  existingTools?: string[];
  additionalRequirements?: string;
}): Promise<VendorChoice> {
  const policy = caveatSummary(input.caveats);
  const existingToolsList =
    input.existingTools && input.existingTools.length > 0
      ? input.existingTools.join(", ")
      : "None provided";

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

Company delegation policy:
${policy}

Research the best vendor options. Check for duplicates. Select the best value option. Estimate monthly cost in ETH (1 ETH ≈ $3000). Return JSON.`;

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
    return {
      ...fallback,
      reasoning: `Vendor research failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
