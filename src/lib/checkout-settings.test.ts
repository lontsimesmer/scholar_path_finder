import { describe, expect, it } from "vitest";

import { formatCheckoutAmountXaf, parseCheckoutAmountInput } from "@/lib/checkout-settings";

describe("checkout settings helpers", () => {
  it("formats XAF amounts with readable spacing", () => {
    expect(formatCheckoutAmountXaf(15625)).toBe("15 625");
  });

  it("parses valid positive XAF amounts that are multiples of five", () => {
    expect(parseCheckoutAmountInput("15 625")).toBe(15625);
    expect(parseCheckoutAmountInput("25000")).toBe(25000);
  });

  it("rejects invalid checkout amounts", () => {
    expect(() => parseCheckoutAmountInput("12.5")).toThrow("invalid_amount");
    expect(() => parseCheckoutAmountInput("0")).toThrow("invalid_amount");
    expect(() => parseCheckoutAmountInput("101")).toThrow("invalid_amount");
  });
});
