import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkMTNPaymentStatus,
  fetchMTNCurrencies,
  requestMTNPayment,
  requestOrangePayment,
} from "@/lib/mobile-money-payment-service";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: mocks.invoke,
    },
  },
}));

describe("mobile money payment service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invoke.mockResolvedValue({ data: { ok: true }, error: null });
  });

  it("fetches MTN currencies through the payment function", async () => {
    await expect(fetchMTNCurrencies()).resolves.toEqual({ ok: true });

    expect(mocks.invoke).toHaveBeenCalledWith("mtn-momo-payment", {
      body: { action: "get_currencies" },
    });
  });

  it("requests and checks MTN payments with explicit payloads", async () => {
    await requestMTNPayment({
      currency: "XAF",
      leadId: "lead-1",
      phoneNumber: "+237612345678",
    });
    expect(mocks.invoke).toHaveBeenCalledWith("mtn-momo-payment", {
      body: {
        action: "request_payment",
        currency: "XAF",
        leadId: "lead-1",
        phoneNumber: "+237612345678",
      },
    });

    await checkMTNPaymentStatus({
      leadId: "lead-1",
      referenceId: "ref-1",
    });
    expect(mocks.invoke).toHaveBeenCalledWith("mtn-momo-payment", {
      body: {
        action: "check_status",
        leadId: "lead-1",
        referenceId: "ref-1",
      },
    });
  });

  it("requests Orange payments through the mobile money function", async () => {
    await requestOrangePayment({
      leadId: "lead-1",
      phoneNumber: "+237690000000",
    });

    expect(mocks.invoke).toHaveBeenCalledWith("process-mobile-money", {
      body: {
        amount: 25,
        leadId: "lead-1",
        phoneNumber: "+237690000000",
        provider: "orange",
      },
    });
  });

  it("throws function invocation errors", async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: { message: "edge failed" } });

    await expect(fetchMTNCurrencies()).rejects.toThrow("edge failed");
  });
});
