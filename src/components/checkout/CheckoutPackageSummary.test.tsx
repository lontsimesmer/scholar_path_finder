import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CheckoutPackageSummary } from "@/components/checkout/CheckoutPackageSummary";

const baseProps = {
  benefits: {
    expert: "Un expert vous accompagne",
    session: "Session de consultation incluse",
    secure: "Paiement securise",
    tailored: "Plan adapte a votre profil",
  },
  guaranteeDescription: "Votre dossier reste suivi apres la consultation.",
  guaranteeTitle: "Garantie accompagnement",
  includedItems: ["Analyse du profil", "Plan d'action", "Questions reponses"],
  includedTitle: "Ce qui est inclus",
  packageCurrency: "XAF",
  packageDescription: "Une consultation claire avant de lancer la procedure.",
  packagePrice: "25 000",
  packageTitle: "Consultation initiale",
  questions: "Vous avez une question ?",
};

describe("CheckoutPackageSummary", () => {
  it("renders the package price, benefits, included items and contact links", () => {
    render(<CheckoutPackageSummary {...baseProps} />);

    expect(screen.getByText("Consultation initiale")).toBeInTheDocument();
    expect(screen.getByText("25 000")).toBeInTheDocument();
    expect(screen.getByText("XAF")).toBeInTheDocument();
    expect(screen.getByText("Un expert vous accompagne")).toBeInTheDocument();
    expect(screen.getByText("Questions reponses")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "powerprestationint@gmail.com" })).toHaveAttribute(
      "href",
      "mailto:powerprestationint@gmail.com",
    );
    expect(screen.getByRole("link", { name: "+(237)674819411" })).toHaveAttribute(
      "href",
      "tel:+237674819411",
    );
  }, 10_000);
});
