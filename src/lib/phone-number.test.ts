import { describe, expect, it } from "vitest";

import {
  buildInternationalPhoneNumber,
  getPhoneNumberComparisonKey,
  normalizePhoneNumber,
} from "@/lib/phone-number";

describe("phone-number helpers", () => {
  it("normalizes an international phone number while keeping the leading plus", () => {
    expect(normalizePhoneNumber(" +237 674-819-411 ")).toBe("+237674819411");
  });

  it("builds a normalized international phone number from country code and local number", () => {
    expect(buildInternationalPhoneNumber("+237", "674 819 411")).toBe("+237674819411");
  });

  it("uses a comparison key that ignores formatting differences", () => {
    expect(getPhoneNumberComparisonKey("+237 674 819 411")).toBe("237674819411");
    expect(getPhoneNumberComparisonKey("237-674-819-411")).toBe("237674819411");
  });
});
