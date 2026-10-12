import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/client", () => ({ getPimlicoGasPrice: vi.fn() }));
vi.mock("@/lib/auth-guard", () => ({ requireSessionUser: vi.fn(), requireEmployeeCompany: vi.fn() }));
vi.mock("@/lib/reimbursements/server", () => ({ loadReimbursementProgram: vi.fn() }));
vi.mock("@/lib/venice", () => ({ checkPolicy: vi.fn(), verifyReceipt: vi.fn() }));

import { requireSessionUser, requireEmployeeCompany } from "@/lib/auth-guard";
import { loadReimbursementProgram } from "@/lib/reimbursements/server";
import { verifyReceipt } from "@/lib/venice";
import { POST } from "@/app/api/agents/reimbursement/claim/route";

const employeeId = "00000000-0000-4000-8000-000000000001";
const companyId = "00000000-0000-4000-8000-000000000002";
const request = () => new NextRequest("http://localhost/api/agents/reimbursement/claim", {
  method: "POST", body: JSON.stringify({ employeeId, companyId, claimDescription: "Client meeting", amountEth: "1", receiptBase64: "image" }),
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireSessionUser).mockResolvedValue({ id: employeeId } as Awaited<ReturnType<typeof requireSessionUser>>);
  vi.mocked(requireEmployeeCompany).mockResolvedValue(undefined);
});

describe("reimbursement claim setup guard", () => {
  it.each(["not_configured", "pending", "paused", "unavailable", "exhausted"] as const)(
    "returns a readable conflict for %s without an agent ID or an AI call", async status => {
      vi.mocked(loadReimbursementProgram).mockResolvedValue({
        program: { status, agentId: null, delegationId: null, remainingAmount: null },
        agent: undefined, delegation: undefined, caveats: [],
      });
      const response = await POST(request());
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ code: "REIMBURSEMENT_NOT_READY", error: expect.any(String) });
      expect(loadReimbursementProgram).toHaveBeenCalledWith(companyId);
      expect(verifyReceipt).not.toHaveBeenCalled();
    },
  );
  it("checks company membership before looking up reimbursement authority", async () => {
    vi.mocked(requireEmployeeCompany).mockRejectedValue(new Error("Forbidden: active employee membership is required."));
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(loadReimbursementProgram).not.toHaveBeenCalled();
    expect(verifyReceipt).not.toHaveBeenCalled();
  });
});
