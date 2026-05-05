import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminCheckoutSettings } from "@/hooks/use-admin-checkout-settings";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: mocks.invoke,
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
  }),
  getErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Unknown error"),
}));

const text = {
  invalidAmountDescription: "Montant invalide",
  invalidAmountTitle: "Prix invalide",
  updateErrorDescription: "Mise a jour impossible",
  updateErrorTitle: "Erreur",
  updateSuccessDescription: "Prix mis a jour",
  updateSuccessTitle: "Prix enregistre",
};

describe("useAdminCheckoutSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invoke.mockResolvedValue({
      data: {
        amountXaf: 15625,
        currency: "XAF",
        formattedAmount: "15 625",
        usdReference: 25,
      },
      error: null,
    });
  });

  it("loads the current checkout amount from the edge function", async () => {
    const { result } = renderHook(() => useAdminCheckoutSettings(text));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mocks.invoke).toHaveBeenCalledWith("get-checkout-settings");
    expect(result.current.settings.amountXaf).toBe(15625);
    expect(result.current.amountInput).toBe("15 625");
  });

  it("rejects invalid amounts before calling the update function", async () => {
    const { result } = renderHook(() => useAdminCheckoutSettings(text));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setAmountInput("abc");
    });
    await act(async () => {
      await result.current.saveSettings();
    });

    expect(mocks.toast).toHaveBeenCalledWith({
      description: "Montant invalide",
      title: "Prix invalide",
      variant: "destructive",
    });
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it("saves valid amounts and refreshes the formatted input", async () => {
    mocks.invoke
      .mockResolvedValueOnce({
        data: {
          amountXaf: 15625,
          currency: "XAF",
          formattedAmount: "15 625",
          usdReference: 25,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          amountXaf: 20000,
          currency: "XAF",
          formattedAmount: "20 000",
          usdReference: 25,
        },
        error: null,
      });
    const { result } = renderHook(() => useAdminCheckoutSettings(text));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setAmountInput("20 000");
    });
    await act(async () => {
      await result.current.saveSettings();
    });

    expect(mocks.invoke).toHaveBeenLastCalledWith("update-checkout-settings", {
      body: { amountXaf: 20000 },
    });
    expect(result.current.settings.amountXaf).toBe(20000);
    expect(result.current.amountInput).toBe("20 000");
    expect(mocks.toast).toHaveBeenCalledWith({
      description: "Prix mis a jour",
      title: "Prix enregistre",
    });
  });
});
