import { describe, expect, it } from "vitest";

import {
  buildAdminDashboardActionItems,
  buildAdminDashboardMetrics,
  buildAdminDashboardOperations,
  defaultAdminDashboardStats,
  formatAdminMetricValue,
  type AdminDashboardText,
} from "@/lib/admin-dashboard";

const text = {
  crmTitle: "CRM",
  crmDescription: "Clients",
  openCrm: "Ouvrir CRM",
  leadsTitle: "Leads",
  leadsDescription: "Prospects",
  openLeads: "Ouvrir leads",
  paymentsTitle: "Paiements",
  paymentsDescription: "Suivi paiements",
  openPayments: "Ouvrir paiements",
  reviewDocumentsTitle: "Documents a traiter",
  reviewDocumentsDescription: "Documents en attente",
  reviewPaymentsTitle: "Paiements en attente",
  reviewPaymentsDescription: "Paiements a surveiller",
  metrics: {
    activeStudents: "Dossiers actifs",
    activeStudentsDescription: "Etudiants suivis",
    paidConsultations: "Consultations payees",
    paidConsultationsDescription: "Paiements confirmes",
    pendingDocuments: "Documents en attente",
    pendingDocumentsDescription: "Documents a traiter",
    pendingPayments: "Paiements en attente",
    pendingPaymentsDescription: "Paiements a verifier",
    publishedPosts: "Articles publies",
    publishedPostsDescription: "Articles visibles",
    totalLeads: "Leads entrants",
    totalLeadsDescription: "Prospects captes",
  },
} as AdminDashboardText;

describe("admin dashboard helpers", () => {
  it("formats metric values while loading", () => {
    expect(formatAdminMetricValue(true, 12)).toBe("...");
    expect(formatAdminMetricValue(false, 12)).toBe(12);
  });

  it("builds dashboard metrics, actions, and operation cards from stats", () => {
    const stats = {
      ...defaultAdminDashboardStats,
      activeStudents: 3,
      paidConsultations: 2,
      pendingDocuments: 4,
      pendingPayments: 1,
      publishedPosts: 5,
      totalLeads: 7,
    };

    expect(buildAdminDashboardMetrics(text, stats, false)).toMatchObject([
      { title: "Dossiers actifs", value: 3 },
      { title: "Leads entrants", value: 7 },
      { title: "Consultations payees", tone: "success", value: 2 },
      { title: "Paiements en attente", tone: "warning", value: 1 },
      { title: "Documents en attente", tone: "neutral", value: 4 },
      { title: "Articles publies", value: 5 },
    ]);

    expect(buildAdminDashboardActionItems(text, stats)).toEqual([
      {
        description: "Paiements a surveiller",
        href: "/admin/payments",
        title: "Paiements en attente",
        value: 1,
      },
      {
        description: "Documents en attente",
        href: "/admin/crm",
        title: "Documents a traiter",
        value: 4,
      },
    ]);

    expect(buildAdminDashboardOperations(text, stats, true)).toMatchObject([
      { cta: "Ouvrir CRM", href: "/admin/crm", title: "CRM", value: "..." },
      { cta: "Ouvrir leads", href: "/admin/leads", title: "Leads", value: "..." },
      { cta: "Ouvrir paiements", href: "/admin/payments", title: "Paiements", value: "..." },
    ]);
  });
});
