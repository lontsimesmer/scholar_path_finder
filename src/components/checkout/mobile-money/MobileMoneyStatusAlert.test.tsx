import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MobileMoneyStatusAlert } from "@/components/checkout/mobile-money/MobileMoneyStatusAlert";

const baseProps = {
  statusMessage: null,
  manualVerification: false,
  transactionRef: "tx-1",
  isCheckingStatus: false,
  pendingTitle: "Paiement en attente",
  pendingMessage: "Confirmez le paiement sur votre telephone.",
  successTitle: "Paiement confirme",
  checkStatusLabel: "Verifier",
  onCheckStatus: vi.fn(),
};

describe("MobileMoneyStatusAlert", () => {
  it("renders nothing when payment is not pending or successful", () => {
    const { container } = render(<MobileMoneyStatusAlert {...baseProps} paymentStatus="idle" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows a pending alert and lets the user request a manual status check", () => {
    const onCheckStatus = vi.fn();
    render(
      <MobileMoneyStatusAlert
        {...baseProps}
        paymentStatus="pending"
        statusMessage="Validation operateur en cours."
        onCheckStatus={onCheckStatus}
      />,
    );

    expect(screen.getByText("Paiement en attente")).toBeInTheDocument();
    expect(screen.getByText("Validation operateur en cours.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Verifier" }));

    expect(onCheckStatus).toHaveBeenCalledTimes(1);
  }, 10_000);

  it("does not show the status check action when manual verification is active", () => {
    render(<MobileMoneyStatusAlert {...baseProps} paymentStatus="pending" manualVerification />);

    expect(screen.queryByRole("button", { name: "Verifier" })).not.toBeInTheDocument();
  });

  it("shows the success confirmation", () => {
    render(<MobileMoneyStatusAlert {...baseProps} paymentStatus="success" />);

    expect(screen.getByText("Paiement confirme")).toBeInTheDocument();
  });
});
