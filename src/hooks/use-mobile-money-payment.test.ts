import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMobileMoneyPayment } from "@/hooks/use-mobile-money-payment";

const mocks = vi.hoisted(() => ({
  checkMTNPaymentStatus: vi.fn(),
  fetchMTNCurrencies: vi.fn(),
  onSuccess: vi.fn(),
  requestMTNPayment: vi.fn(),
  requestOrangePayment: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/i18n/language", () => ({
  useLanguage: () => ({
    t: {
      checkout: {
        payment: {
          errorDescription: "Paiement impossible",
          errorTitle: "Erreur paiement",
          manualInstructions: "Instructions manuelles",
          missingLeadDescription: "Dossier introuvable",
          missingLeadTitle: "Dossier manquant",
          missingPhoneDescription: "Telephone requis",
          missingPhoneTitle: "Telephone manquant",
          mtnInstructions: "Validez sur votre telephone",
          mtnRequestSent: "Demande MTN envoyee",
          pendingMessage: "Paiement en attente",
          pendingTitle: "En attente",
          pollFailed: "Paiement echoue",
          pollPending: "Verification en attente",
          providerLabel: "Operateur",
          requestFailed: "Demande refusee",
          successMessage: "Paiement confirme",
          successTitle: "Succes",
        },
        selectPayment: "Choisissez un moyen de paiement",
      },
    },
  }),
}));

vi.mock("@/lib/mobile-money-payment-service", () => ({
  checkMTNPaymentStatus: mocks.checkMTNPaymentStatus,
  fetchMTNCurrencies: mocks.fetchMTNCurrencies,
  requestMTNPayment: mocks.requestMTNPayment,
  requestOrangePayment: mocks.requestOrangePayment,
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
  getErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Unknown error"),
}));

const submitEvent = {
  preventDefault: vi.fn(),
} as unknown as React.FormEvent;

describe("useMobileMoneyPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchMTNCurrencies.mockResolvedValue({
      currencies: [
        { amount: "15625", code: "XAF", rate: 625 },
        { amount: "25", code: "USD", rate: 1 },
      ],
    });
    mocks.requestMTNPayment.mockResolvedValue({
      amount: "15625",
      message: "Envoyez le paiement",
      status: "pending_verification",
      success: true,
      targetAccount: "651831709",
    });
    mocks.requestOrangePayment.mockResolvedValue({
      message: "Paiement Orange en attente",
      targetAccount: "690830651",
    });
  });

  it("loads currency options and updates the displayed amount when currency changes", async () => {
    const { result } = renderHook(() => useMobileMoneyPayment({ leadId: "lead-1", onSuccess: mocks.onSuccess }));

    await waitFor(() => {
      expect(result.current.currencies).toHaveLength(2);
    });
    expect(result.current.localAmount).toBe("15625");

    act(() => {
      result.current.setCurrency("USD");
    });
    expect(result.current.localAmount).toBe("25");
  });

  it("requires a provider before submitting", async () => {
    const { result } = renderHook(() => useMobileMoneyPayment({ leadId: "lead-1", onSuccess: mocks.onSuccess }));

    await act(async () => {
      await result.current.handleSubmit(submitEvent);
    });

    expect(mocks.toast).toHaveBeenCalledWith({
      description: "Choisissez un moyen de paiement",
      title: "Operateur",
      variant: "destructive",
    });
    expect(mocks.requestMTNPayment).not.toHaveBeenCalled();
  });

  it("blocks payment requests when the lead id is missing", async () => {
    const { result } = renderHook(() => useMobileMoneyPayment({ leadId: null, onSuccess: mocks.onSuccess }));

    act(() => {
      result.current.setProvider("mtn");
      result.current.setPhoneNumber("612345678");
    });
    await act(async () => {
      await result.current.handleSubmit(submitEvent);
    });

    expect(mocks.toast).toHaveBeenCalledWith({
      description: "Dossier introuvable",
      title: "Dossier manquant",
      variant: "destructive",
    });
  });

  it("submits MTN manual verification payments with normalized phone numbers", async () => {
    const { result } = renderHook(() => useMobileMoneyPayment({ leadId: "lead-1", onSuccess: mocks.onSuccess }));

    act(() => {
      result.current.setProvider("mtn");
      result.current.setPhoneNumber("061 23 45 67 8");
    });
    await act(async () => {
      await result.current.handleSubmit(submitEvent);
    });

    expect(mocks.requestMTNPayment).toHaveBeenCalledWith({
      currency: "XAF",
      leadId: "lead-1",
      phoneNumber: "+237612345678",
    });
    expect(result.current.paymentStatus).toBe("pending");
    expect(result.current.manualVerification).toBe(true);
    expect(result.current.displayedAccount).toBe("651831709");
    expect(mocks.toast).toHaveBeenCalledWith({
      description: "Envoyez le paiement",
      title: "Instructions manuelles",
    });
  });

  it("submits Orange Money payments as manual verification", async () => {
    const { result } = renderHook(() => useMobileMoneyPayment({ leadId: "lead-1", onSuccess: mocks.onSuccess }));

    act(() => {
      result.current.setProvider("orange");
      result.current.setPhoneNumber("690000000");
    });
    await act(async () => {
      await result.current.handleSubmit(submitEvent);
    });

    expect(mocks.requestOrangePayment).toHaveBeenCalledWith({
      leadId: "lead-1",
      phoneNumber: "+237690000000",
    });
    expect(result.current.paymentStatus).toBe("pending");
    expect(result.current.manualVerification).toBe(true);
    expect(result.current.displayedAccount).toBe("690830651");
  });
});
