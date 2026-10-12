import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReimbursementsCard } from "../components/reimbursements-card";
import type { ReimbursementProgram } from "../lib/reimbursements/shared";

const program: ReimbursementProgram = { status: "not_configured", agentId: null, delegationId: null, remainingAmount: null };
const handlers = { onOpen: () => {}, onRefresh: () => {} };

describe("permanent reimbursement entry point", () => {
  it("gives an employer a setup action before any delegation exists", () => {
    const html = renderToStaticMarkup(<ReimbursementsCard role="employer" program={program} accountReady {...handlers} />);
    expect(html).toContain('id="reimbursements"');
    expect(html).toContain("Set up reimbursement budget");
    expect(html).not.toContain("Reimbursement Agent");
  });
  it("shows employees setup status rather than a broken submit action", () => {
    const html = renderToStaticMarkup(<ReimbursementsCard role="employee" program={program} accountReady {...handlers} />);
    expect(html).toContain("View reimbursement status");
    expect(html).toContain("Ask your employer");
    expect(html).not.toContain("New reimbursement claim");
  });
  it("offers a claim without requiring a personal spending delegation", () => {
    const html = renderToStaticMarkup(<ReimbursementsCard role="employee" program={{ ...program, status: "ready" }} accountReady {...handlers} />);
    expect(html).toContain("New reimbursement claim");
  });
  it("requires a payout account even when the company budget is ready", () => {
    const html = renderToStaticMarkup(<ReimbursementsCard role="employee" program={{ ...program, status: "ready" }} accountReady={false} {...handlers} />);
    expect(html).toContain("Activate your account");
    expect(html).not.toContain("New reimbursement claim");
  });
});
