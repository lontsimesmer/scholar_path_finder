import { describe, expect, it } from "vitest";

import {
  buildProcedureCheckoutPath,
  doesProcedurePaymentRequireAction,
  isProcedurePaymentPending,
} from "@/lib/procedure-lead";

describe("procedure lead helpers", () => {
  it("identifies payment states that require a student action", () => {
    expect(doesProcedurePaymentRequireAction("unpaid")).toBe(true);
    expect(doesProcedurePaymentRequireAction("refunded")).toBe(true);
    expect(doesProcedurePaymentRequireAction("paid")).toBe(false);
    expect(doesProcedurePaymentRequireAction(null)).toBe(false);
  });

  it("identifies pending payment states", () => {
    expect(isProcedurePaymentPending("pending")).toBe(true);
    expect(isProcedurePaymentPending("mobile_money_pending")).toBe(true);
    expect(isProcedurePaymentPending("bank_transfer_pending")).toBe(true);
    expect(isProcedurePaymentPending("paid")).toBe(false);
  });

  it("builds a checkout path with encoded lead context", () => {
    expect(
      buildProcedureCheckoutPath({
        leadId: "lead 1",
        email: "student+test@example.com",
      }),
    ).toBe("/checkout?leadId=lead%201&email=student%2Btest%40example.com");

    expect(buildProcedureCheckoutPath(null)).toBeNull();
  });
});
