import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminPaymentsFilters } from "@/components/admin/payments/AdminPaymentsFilters";
import { AdminPaymentsMetrics } from "@/components/admin/payments/AdminPaymentsMetrics";
import { AdminPaymentsTable } from "@/components/admin/payments/AdminPaymentsTable";
import type { AdminPaymentsText, LeadRecord, PaymentTransactionRecord } from "@/lib/admin-payments";

const text: AdminPaymentsText = {
  breadcrumbCurrent: "Paiements",
  breadcrumbDashboard: "Dashboard",
  channels: {
    ALL: "Tous les canaux",
    CREDIT_CARD: "Carte",
    MOBILE_MONEY: "Mobile Money",
    WALLET: "Wallet",
  },
  columns: {
    transaction: "Transaction",
    student: "Etudiant",
    amount: "Montant",
    status: "Statut",
    context: "Contexte",
    createdAt: "Date",
    actions: "Actions",
  },
  empty: "Aucune transaction",
  filters: {
    status: "Statut du paiement",
    channel: "Canal de paiement",
    all: "Tous",
  },
  localStatuses: {
    accepted: "Accepte",
    failed: "Echoue",
    initialized: "Initialise",
    pending: "En attente",
    refused: "Refuse",
  },
  metrics: {
    total: "Transactions",
    accepted: "Acceptees",
    pending: "En attente",
    failed: "Echouees",
    acceptedAmount: "Montant encaisse",
    totalDescription: "Toutes les transactions",
    acceptedDescription: "Paiements confirmes",
    pendingDescription: "Paiements a verifier",
    failedDescription: "Paiements echoues",
    acceptedAmountDescription: "Total confirme",
  },
  noLead: "Aucun lead",
  noStudent: "Aucun etudiant",
  openCheckout: "Ouvrir checkout",
  openLeads: "Ouvrir leads",
  searchPlaceholder: "Rechercher une transaction",
  subtitle: "Suivi des paiements",
  title: "Paiements",
};

const transaction: PaymentTransactionRecord = {
  id: "payment-1",
  lead_id: "lead-1",
  student_id: "student-1",
  transaction_id: "SIM-847c41dc78314fc89d02b54ba5977",
  payment_url: "https://pay.example/tx",
  channel: "MOBILE_MONEY",
  amount: 25000,
  currency: "XAF",
  local_status: "accepted",
  provider_status: "ACCEPTED",
  customer_email: "student@example.com",
  created_at: "2026-01-01T00:00:00.000Z",
};

const lead = {
  id: "lead-1",
  email: "lead@example.com",
  name: "Lead Test",
} as LeadRecord;

describe("AdminPayments view parts", () => {
  it("labels filters clearly and emits search changes", () => {
    const onSearchQueryChange = vi.fn();
    render(
      <AdminPaymentsFilters
        channelFilter="all"
        onChannelFilterChange={vi.fn()}
        onSearchQueryChange={onSearchQueryChange}
        onStatusFilterChange={vi.fn()}
        searchQuery=""
        statusFilter="all"
        text={text}
      />,
    );

    expect(screen.getByText("Statut du paiement")).toBeInTheDocument();
    expect(screen.getByText("Canal de paiement")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Rechercher une transaction"), {
      target: { value: "SIM-847" },
    });

    expect(onSearchQueryChange).toHaveBeenCalledWith("SIM-847");
  }, 10_000);

  it("renders payment metrics", () => {
    render(
      <AdminPaymentsMetrics
        acceptedAmountLabel="25 000 XAF"
        stats={{ total: 3, accepted: 1, pending: 1, failed: 1 }}
        text={text}
      />,
    );

    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.getByText("25 000 XAF")).toBeInTheDocument();
  });

  it("renders transactions and opens external payment urls", () => {
    const onOpenPaymentUrl = vi.fn();
    render(
      <MemoryRouter>
        <AdminPaymentsTable
          amountFormatter={new Intl.NumberFormat("fr-FR")}
          dateFormatter={new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" })}
          filteredTransactions={[transaction]}
          isLoading={false}
          leadById={{ "lead-1": lead }}
          noStudentLabel="Aucun etudiant"
          onOpenPaymentUrl={onOpenPaymentUrl}
          profileById={{
            "student-1": {
              id: "student-1",
              email: "student@example.com",
              first_name: "Ada",
              last_name: "Lovelace",
            },
          }}
          text={text}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("SIM-847c41dc78314fc89d02b54ba5977")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ouvrir checkout" })).toHaveAttribute(
      "href",
      "/checkout?leadId=lead-1&email=lead%40example.com",
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onOpenPaymentUrl).toHaveBeenCalledWith("https://pay.example/tx");
  }, 10_000);

  it("shows loading and empty states", () => {
    const props = {
      amountFormatter: new Intl.NumberFormat("fr-FR"),
      dateFormatter: new Intl.DateTimeFormat("fr-FR"),
      filteredTransactions: [],
      leadById: {},
      noStudentLabel: "Aucun etudiant",
      onOpenPaymentUrl: vi.fn(),
      profileById: {},
      text,
    };

    const { rerender } = render(
      <MemoryRouter>
        <AdminPaymentsTable {...props} isLoading />
      </MemoryRouter>,
    );

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AdminPaymentsTable {...props} isLoading={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Aucune transaction")).toBeInTheDocument();
  });
});
