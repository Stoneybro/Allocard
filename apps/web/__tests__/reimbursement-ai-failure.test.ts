import { afterEach, describe, expect, it, vi } from "vitest";
import { checkPolicy, verifyReceipt } from "../lib/ai";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("reimbursement AI availability", () => {
  it("does not approve a claim when the provider is rate limited", async () => {
    vi.stubEnv("DASHSCOPE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await checkPolicy({ claimDescription: "Client meeting", amountEth: "0.01", caveats: [] });
    expect(result.approved).toBe(false);
    expect(result.confidence).toBe(0);
  });
  it("does not mark a receipt as verified when the provider is rate limited", async () => {
    vi.stubEnv("DASHSCOPE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await verifyReceipt({ imageBase64: "test", claimDescription: "Client meeting", amountEth: "0.01" });
    expect(result.verified).toBe(false);
    expect(result.confidence).toBe(0);
  });
});
