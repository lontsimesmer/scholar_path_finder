import { describe, expect, it } from "vitest";

import {
  buildLoginFromVerificationUrl,
  buildVerifyContactUrl,
  parseVerificationChannels,
  sanitizeAppRedirect,
  selectNextPendingVerificationChannel,
} from "@/lib/contact-verification";

describe("contact verification helpers", () => {
  it("parses valid verification channels only", () => {
    expect(parseVerificationChannels("email,sms,unknown")).toEqual(["email", "sms"]);
    expect(parseVerificationChannels("")).toEqual([]);
  });

  it("sanitizes app redirects to internal paths only", () => {
    expect(sanitizeAppRedirect("/dashboard")).toBe("/dashboard");
    expect(sanitizeAppRedirect("https://evil.example")).toBe("/dashboard");
    expect(sanitizeAppRedirect(null, "/login")).toBe("/login");
  });

  it("prefers requested channels when selecting the next pending verification", () => {
    expect(selectNextPendingVerificationChannel(["sms", "email"], ["email"])).toBe("email");
    expect(selectNextPendingVerificationChannel(["sms"], ["email"])).toBe("sms");
  });

  it("builds verification and login URLs with safe query parameters", () => {
    expect(
      buildVerifyContactUrl({
        token: "signed-token",
        email: "student@example.com",
        channels: ["email", "sms"],
        redirect: "https://evil.example",
      }),
    ).toBe(
      "/verify-contact?channels=email%2Csms&token=signed-token&email=student%40example.com&redirect=%2Fdashboard",
    );

    expect(
      buildLoginFromVerificationUrl({
        email: "student@example.com",
        redirect: "/start-procedure",
      }),
    ).toBe("/login?email=student%40example.com&redirect=%2Fstart-procedure");
  });
});
