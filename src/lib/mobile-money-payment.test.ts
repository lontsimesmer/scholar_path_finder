import { describe, expect, it } from "vitest";

import {
  DEFAULT_MOBILE_MONEY_AMOUNT,
  MOBILE_MONEY_PROVIDERS,
  formatMobileMoneyPhoneNumber,
  getCurrencyAmount,
} from "@/lib/mobile-money-payment";

describe("mobile money payment helpers", () => {
  it("formats local phone numbers with the selected international prefix", () => {
    expect(formatMobileMoneyPhoneNumber("+237", " 061 23 45 67 8 ")).toBe("+237612345678");
  });

  it("returns configured currency amounts with the XAF fallback", () => {
    expect(
      getCurrencyAmount(
        [
          { amount: "25", code: "USD", rate: 1 },
          { amount: "15625", code: "XAF", rate: 625 },
        ],
        "USD",
      ),
    ).toBe("25");
    expect(getCurrencyAmount([], "EUR")).toBe(DEFAULT_MOBILE_MONEY_AMOUNT);
  });

  it("keeps supported providers explicit", () => {
    expect(MOBILE_MONEY_PROVIDERS.map((provider) => provider.id)).toEqual(["mtn", "orange"]);
  });
});
