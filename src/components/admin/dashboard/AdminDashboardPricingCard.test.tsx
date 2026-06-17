import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminDashboardPricingCard } from "@/components/admin/dashboard/AdminDashboardPricingCard";

const checkoutSettingsMock = vi.hoisted(() => ({
  amountInput: "25000",
  isLoading: false,
  isSaving: false,
  saveSettings: vi.fn(),
  setAmountInput: vi.fn(),
  settings: {
    amount: 25000,
    currency: "XAF",
    formattedAmount: "25 000",
  },
}));

vi.mock("@/hooks/use-admin-checkout-settings", () => ({
  useAdminCheckoutSettings: () => checkoutSettingsMock,
}));

const text = {
  title: "Prix de consultation",
  description: "Modifiez le prix utilise pendant le checkout.",
  amountLabel: "Montant",
  amountHelp: "Ce montant sera applique aux prochains paiements.",
  currentPriceLabel: "Montant actuel",
  save: "Enregistrer",
  saving: "Enregistrement",
  loading: "Chargement",
  invalidAmountTitle: "Montant invalide",
  invalidAmountDescription: "Indiquez un montant positif.",
  updateSuccessTitle: "Prix mis a jour",
  updateSuccessDescription: "Le prix de consultation est disponible.",
  updateErrorTitle: "Erreur",
  updateErrorDescription: "Impossible de mettre a jour le prix.",
};

describe("AdminDashboardPricingCard", () => {
  beforeEach(() => {
    checkoutSettingsMock.amountInput = "25000";
    checkoutSettingsMock.isLoading = false;
    checkoutSettingsMock.isSaving = false;
    checkoutSettingsMock.saveSettings.mockClear();
    checkoutSettingsMock.setAmountInput.mockClear();
    checkoutSettingsMock.settings.formattedAmount = "25 000";
  });

  it("prefills the consultation price with the current amount", () => {
    render(<AdminDashboardPricingCard text={text} />);

    expect(screen.getByLabelText("Montant")).toHaveValue("25000");
    expect(screen.getByText("25 000 XAF")).toBeInTheDocument();
  });

  it("updates and saves the consultation price", () => {
    render(<AdminDashboardPricingCard text={text} />);

    fireEvent.change(screen.getByLabelText("Montant"), { target: { value: "30000" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    expect(checkoutSettingsMock.setAmountInput).toHaveBeenCalledWith("30000");
    expect(checkoutSettingsMock.saveSettings).toHaveBeenCalledTimes(1);
  }, 10_000);

  it("disables the form while loading", () => {
    checkoutSettingsMock.isLoading = true;

    render(<AdminDashboardPricingCard text={text} />);

    expect(screen.getByLabelText("Montant")).toBeDisabled();
    expect(screen.getByRole("button", { name: /enregistrer/i })).toBeDisabled();
  }, 10_000);
});
