import { describe, expect, it } from "vitest";

import { splitInternationalPhoneNumber } from "@/lib/country-codes";

describe("country code helpers", () => {
  it("splits known international phone prefixes from local numbers", () => {
    expect(splitInternationalPhoneNumber("+237612345678")).toEqual({
      countryCode: "+237",
      localNumber: "612345678",
    });
    expect(splitInternationalPhoneNumber("+33123456789")).toEqual({
      countryCode: "+33",
      localNumber: "123456789",
    });
  });

  it("falls back for empty or unknown prefixes", () => {
    expect(splitInternationalPhoneNumber(null)).toEqual({
      countryCode: "+237",
      localNumber: "",
    });
    expect(splitInternationalPhoneNumber("+999123")).toEqual({
      countryCode: "+237",
      localNumber: "999123",
    });
  });
});
