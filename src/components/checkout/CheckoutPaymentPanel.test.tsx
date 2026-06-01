import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CheckoutPaymentPanel } from "@/components/checkout/CheckoutPaymentPanel";
import type { PaymentMethod } from "@/lib/checkout";
import { DEFAULT_MANUAL_ORANGE_MONEY } from "@/lib/checkout-settings";

vi.mock("@/components/checkout/CinetpayPayment", () => ({
  CinetpayPayment: ({
    identity,
    leadId,
    paymentMethod,
    userEmail,
  }: {
    identity: { firstName: string; lastName: string };
    leadId: string | null;
    paymentMethod: PaymentMethod;
    userEmail: string | null;
  }) => (
    <div data-testid="cinetpay-payment">
      {paymentMethod}|{leadId}|{userEmail}|{identity.firstName} {identity.lastName}
    </div>
  ),
}));

vi.mock("@/components/checkout/ManualOrangeMoneyPayment", () => ({
  __esModule: true,
  default: ({ leadId }: { leadId: string | null }) => (
    <div data-testid="manual-orange-money-payment">manual|{leadId ?? "no-lead"}</div>
  ),
}));

const text = {
  methods: {
    mobileMoney: { title: "Mobile Money" },
    card: { title: "Carte bancaire" },
  },
  paymentDetails: {
    card: { title: "Paiement par carte" },
    mobileMoney: { title: "Paiement mobile" },
  },
  selectPayment: "Choisir un moyen de paiement",
  terms: "Le paiement est verifie par le serveur.",
};

describe("CheckoutPaymentPanel", () => {
  it("renders the selected mobile money method and forwards checkout identity", () => {
    render(
      <CheckoutPaymentPanel
        identity={{ first_name: "Ada", last_name: "Lovelace" }}
        leadId="lead-1"
        paymentMethod="mobile_money"
        paymentMode="cinetpay"
        manualOrangeMoney={DEFAULT_MANUAL_ORANGE_MONEY}
        text={text}
        userEmail="ada@example.com"
        onPaymentMethodChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Choisir un moyen de paiement")).toBeInTheDocument();
    expect(screen.getByText("Paiement mobile")).toBeInTheDocument();
    expect(screen.getByTestId("cinetpay-payment")).toHaveTextContent(
      "mobile_money|lead-1|ada@example.com|Ada Lovelace",
    );
    expect(screen.queryByTestId("manual-orange-money-payment")).not.toBeInTheDocument();
  });

  it("lets the user switch to card payment", () => {
    const onPaymentMethodChange = vi.fn();
    render(
      <CheckoutPaymentPanel
        identity={null}
        leadId={null}
        paymentMethod="mobile_money"
        paymentMode="cinetpay"
        manualOrangeMoney={DEFAULT_MANUAL_ORANGE_MONEY}
        text={text}
        userEmail={null}
        onPaymentMethodChange={onPaymentMethodChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /carte bancaire/i }));

    expect(onPaymentMethodChange).toHaveBeenCalledWith("card");
  }, 20_000);

  it("renders the manual Orange Money panel when payment_mode is manual_orange_money", () => {
    render(
      <CheckoutPaymentPanel
        identity={null}
        leadId="lead-99"
        paymentMethod="mobile_money"
        paymentMode="manual_orange_money"
        manualOrangeMoney={DEFAULT_MANUAL_ORANGE_MONEY}
        text={text}
        userEmail={null}
        onPaymentMethodChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("manual-orange-money-payment")).toHaveTextContent(
      "manual|lead-99",
    );
    expect(screen.queryByText("Choisir un moyen de paiement")).not.toBeInTheDocument();
    expect(screen.queryByTestId("cinetpay-payment")).not.toBeInTheDocument();
  });
});
