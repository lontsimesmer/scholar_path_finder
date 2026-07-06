import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildAdminLeadStats,
  buildLeadCheckoutLink,
  copyLeadCheckoutLink,
  filterAdminLeads,
  getAdminLeadPaymentBadgeClassName,
  getAdminLeadPaymentLabel,
  getAdminLeadPipelineLabel,
  type AdminLeadsText,
  type LeadRecord,
} from "@/lib/admin-leads";

const createLead = (overrides: Partial<LeadRecord>): LeadRecord =>
  ({
    id: "lead-1",
    name: "Amina Talla",
    email: "amina@example.com",
    phone: "+237600000000",
    message: "Je veux partir etudier",
    status: "pending",
    payment_status: "unpaid",
    payment_id: null,
    follow_up_count: 0,
    last_follow_up_at: null,
    next_follow_up_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }) as LeadRecord;

const text = {
  notProvided: "Non renseigne",
  paymentStatuses: {
    paid: "Payee",
    unpaid: "Non payee",
  },
  pipelineStatuses: {
    pending: "Nouveau",
  },
} as AdminLeadsText;

describe("admin leads helpers", () => {
  it("filters leads by query, payment status, and pipeline status", () => {
    const matchingLead = createLead({
      payment_status: "paid",
      status: "follow_up",
    });
    const otherLead = createLead({
      id: "lead-2",
      email: "other@example.com",
      message: "Autre demande",
      name: "Jean Dupont",
      payment_status: "unpaid",
    });

    expect(
      filterAdminLeads({
        leads: [matchingLead, otherLead],
        paymentFilter: "paid",
        pipelineFilter: "follow_up",
        query: "amina",
      }),
    ).toEqual([matchingLead]);
  });

  it("builds operational stats including pending payments and due follow-ups", () => {
    vi.setSystemTime(new Date("2026-01-05T00:00:00.000Z"));

    expect(
      buildAdminLeadStats([
        createLead({ payment_status: "paid" }),
        createLead({ id: "lead-2", payment_status: "mobile_money_pending" }),
        createLead({ id: "lead-3", next_follow_up_at: "2026-01-04T00:00:00.000Z" }),
        createLead({ id: "lead-4", status: "follow_up" }),
      ]),
    ).toEqual({
      followUpDueCount: 2,
      paidCount: 1,
      pendingPaymentsCount: 1,
      total: 4,
    });

    vi.useRealTimers();
  });

  it("returns translated labels and stable badge classes", () => {
    expect(getAdminLeadPaymentLabel(text, "paid")).toBe("Payee");
    expect(getAdminLeadPaymentLabel(text, "unknown")).toBe("unknown");
    expect(getAdminLeadPipelineLabel(text, "pending")).toBe("Nouveau");
    expect(getAdminLeadPaymentBadgeClassName("paid")).toContain("text-success");
    expect(getAdminLeadPaymentBadgeClassName("pending")).toContain("warning");
    expect(getAdminLeadPaymentBadgeClassName(null)).toContain("muted");
  });

  describe("buildLeadCheckoutLink", () => {
    it("encodes the lead identifier and email in the checkout url", () => {
      expect(
        buildLeadCheckoutLink(
          { leadId: "lead-123", email: "Ada@Example.com" },
          "https://powerprestation.com",
        ),
      ).toBe("https://powerprestation.com/checkout?leadId=lead-123&email=Ada%40Example.com");
    });

    it("trims a trailing slash from the origin", () => {
      expect(
        buildLeadCheckoutLink(
          { leadId: "lead-9", email: "a@b.co" },
          "https://powerprestation.com/",
        ),
      ).toBe("https://powerprestation.com/checkout?leadId=lead-9&email=a%40b.co");
    });
  });

  describe("copyLeadCheckoutLink", () => {
    const writeText = vi.fn();
    const originalNavigator = globalThis.navigator;

    beforeEach(() => {
      writeText.mockReset();
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: { clipboard: { writeText } },
      });
    });

    afterEach(() => {
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: originalNavigator,
      });
    });

    it("writes the checkout url to the clipboard and returns true", async () => {
      writeText.mockResolvedValue(undefined);
      const result = await copyLeadCheckoutLink(
        { id: "lead-42", email: "student@example.com" },
        "https://powerprestation.com",
      );
      expect(result).toBe(true);
      expect(writeText).toHaveBeenCalledWith(
        "https://powerprestation.com/checkout?leadId=lead-42&email=student%40example.com",
      );
    });

    it("returns false when the clipboard write throws", async () => {
      writeText.mockRejectedValue(new Error("blocked"));
      const result = await copyLeadCheckoutLink(
        { id: "lead-42", email: "student@example.com" },
        "https://powerprestation.com",
      );
      expect(result).toBe(false);
    });

    it("returns false when the clipboard api is unavailable", async () => {
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: {},
      });
      const result = await copyLeadCheckoutLink(
        { id: "lead-42", email: "student@example.com" },
        "https://powerprestation.com",
      );
      expect(result).toBe(false);
    });
  });
});
