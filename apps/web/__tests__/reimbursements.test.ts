import { describe, expect, it } from "vitest";
import { findReimbursementDelegation, reimbursementStatus } from "../lib/reimbursements/shared";

const budget = {
  id: "budget", delegatorType: "company", delegatorId: "company-a",
  delegateeType: "agent", delegateeId: "reimbursement", status: "active", signedDelegation: { signature: "signed" },
};

describe("built-in reimbursement setup", () => {
  it("keeps the feature available as unconfigured without a canvas delegation", () => {
    expect(reimbursementStatus("reimbursement", findReimbursementDelegation([], "company-a", "reimbursement"))).toBe("not_configured");
  });
  it("reuses an existing authorized reimbursement budget", () => {
    const selected = findReimbursementDelegation([{ ...budget, id: "old", status: "revoked" }, budget], "company-a", "reimbursement");
    expect(selected?.id).toBe("budget");
    expect(reimbursementStatus("reimbursement", selected)).toBe("ready");
  });
  it("does not enable payouts from an unsigned or pending setup", () => {
    expect(reimbursementStatus("reimbursement", { ...budget, signedDelegation: null })).toBe("pending");
    expect(reimbursementStatus("reimbursement", { ...budget, status: "pending_config" })).toBe("pending");
  });
  it("never uses another company's budget or an employee redelegation", () => {
    expect(findReimbursementDelegation([budget], "company-b", "reimbursement")).toBeUndefined();
    expect(findReimbursementDelegation([{ ...budget, delegatorType: "user" }], "company-a", "reimbursement")).toBeUndefined();
    expect(findReimbursementDelegation([budget], "company-a", "travel")).toBeUndefined();
  });
  it("shows paused payouts when authorization has been revoked", () => {
    expect(reimbursementStatus("reimbursement", { ...budget, status: "revoked" })).toBe("paused");
  });
  it("resumes unfinished setup before selecting a revoked budget", () => {
    const selected = findReimbursementDelegation([
      { ...budget, status: "revoked" }, { ...budget, id: "new", status: "pending_config", signedDelegation: null },
    ], "company-a", "reimbursement");
    expect(selected?.id).toBe("new");
  });
  it("reports unavailable service separately from missing company setup", () => {
    expect(reimbursementStatus(null, undefined)).toBe("unavailable");
  });
});
