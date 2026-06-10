import { BookOpenText, CircleDollarSign, CreditCard, FileSearch, ShieldCheck, Users } from "lucide-react";

import { LucideIcon } from "lucide-react";

export interface AdminDashboardStats {
  activeStudents: number;
  publishedPosts: number;
  totalLeads: number;
  paidConsultations: number;
  pendingPayments: number;
  pendingDocuments: number;
}

export interface AdminDashboardText {
  title: string;
  subtitle: string;
  signOut: string;
  crmTitle: string;
  crmDescription: string;
  openCrm: string;
  blogTitle: string;
  blogDescription: string;
  manageBlogs: string;
  newArticle: string;
  publicSite: string;
  viewSite: string;
  seoHealth: string;
  optimizationOk: string;
  settings: string;
  leadsTitle: string;
  leadsDescription: string;
  openLeads: string;
  paymentsTitle: string;
  paymentsDescription: string;
  openPayments: string;
  operationalOverview: string;
  operationalDescription: string;
  actionRequiredTitle: string;
  actionRequiredDescription: string;
  reviewDocumentsTitle: string;
  reviewDocumentsDescription: string;
  reviewPaymentsTitle: string;
  reviewPaymentsDescription: string;
  pricing: {
    title: string;
    description: string;
    amountLabel: string;
    amountHelp: string;
    currentPriceLabel: string;
    save: string;
    saving: string;
    loading: string;
    invalidAmountTitle: string;
    invalidAmountDescription: string;
    updateSuccessTitle: string;
    updateSuccessDescription: string;
    updateErrorTitle: string;
    updateErrorDescription: string;
  };
  metrics: {
    activeStudents: string;
    totalLeads: string;
    paidConsultations: string;
    pendingPayments: string;
    pendingDocuments: string;
    publishedPosts: string;
    activeStudentsDescription: string;
    totalLeadsDescription: string;
    paidConsultationsDescription: string;
    pendingPaymentsDescription: string;
    pendingDocumentsDescription: string;
    publishedPostsDescription: string;
  };
}

export const defaultAdminDashboardStats: AdminDashboardStats = {
  activeStudents: 0,
  publishedPosts: 0,
  totalLeads: 0,
  paidConsultations: 0,
  pendingPayments: 0,
  pendingDocuments: 0,
};

type AdminMetricTone = "primary" | "success" | "warning" | "neutral";

export type AdminDashboardMetric = {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  tone?: AdminMetricTone;
};

export type AdminDashboardActionItem = {
  title: string;
  description: string;
  value: number;
  href: string;
};

export type AdminDashboardOperationItem = {
  title: string;
  description: string;
  href: string;
  cta: string;
  value: number | string;
  icon: LucideIcon;
  iconClassName: string;
  buttonVariant?: "default" | "outline";
};

export const formatAdminMetricValue = (isLoading: boolean, value: number) => (isLoading ? "..." : value);

export const buildAdminDashboardMetrics = (
  text: AdminDashboardText,
  stats: AdminDashboardStats,
  isLoading: boolean,
): AdminDashboardMetric[] => [
  {
    title: text.metrics.activeStudents,
    value: formatAdminMetricValue(isLoading, stats.activeStudents),
    description: text.metrics.activeStudentsDescription,
    icon: Users,
  },
  {
    title: text.metrics.totalLeads,
    value: formatAdminMetricValue(isLoading, stats.totalLeads),
    description: text.metrics.totalLeadsDescription,
    icon: FileSearch,
  },
  {
    title: text.metrics.paidConsultations,
    value: formatAdminMetricValue(isLoading, stats.paidConsultations),
    description: text.metrics.paidConsultationsDescription,
    icon: CircleDollarSign,
    tone: "success",
  },
  {
    title: text.metrics.pendingPayments,
    value: formatAdminMetricValue(isLoading, stats.pendingPayments),
    description: text.metrics.pendingPaymentsDescription,
    icon: CreditCard,
    tone: "warning",
  },
  {
    title: text.metrics.pendingDocuments,
    value: formatAdminMetricValue(isLoading, stats.pendingDocuments),
    description: text.metrics.pendingDocumentsDescription,
    icon: ShieldCheck,
    tone: "neutral",
  },
  {
    title: text.metrics.publishedPosts,
    value: formatAdminMetricValue(isLoading, stats.publishedPosts),
    description: text.metrics.publishedPostsDescription,
    icon: BookOpenText,
  },
];

export const buildAdminDashboardActionItems = (
  text: AdminDashboardText,
  stats: AdminDashboardStats,
): AdminDashboardActionItem[] => [
  {
    title: text.reviewPaymentsTitle,
    description: text.reviewPaymentsDescription,
    value: stats.pendingPayments,
    href: "/admin/payments",
  },
  {
    title: text.reviewDocumentsTitle,
    description: text.reviewDocumentsDescription,
    value: stats.pendingDocuments,
    href: "/admin/crm",
  },
];

export const buildAdminDashboardOperations = (
  text: AdminDashboardText,
  stats: AdminDashboardStats,
  isLoading: boolean,
): AdminDashboardOperationItem[] => [
  {
    title: text.crmTitle,
    description: text.crmDescription,
    href: "/admin/crm",
    cta: text.openCrm,
    value: formatAdminMetricValue(isLoading, stats.activeStudents),
    icon: Users,
    iconClassName: "bg-primary/10 text-primary",
  },
  {
    title: text.leadsTitle,
    description: text.leadsDescription,
    href: "/admin/leads",
    cta: text.openLeads,
    value: formatAdminMetricValue(isLoading, stats.totalLeads),
    icon: FileSearch,
    iconClassName: "bg-success/10 text-success",
    buttonVariant: "outline",
  },
  {
    title: text.paymentsTitle,
    description: text.paymentsDescription,
    href: "/admin/payments",
    cta: text.openPayments,
    value: formatAdminMetricValue(isLoading, stats.pendingPayments),
    icon: CreditCard,
    iconClassName: "bg-warning/10 text-warning",
    buttonVariant: "outline",
  },
];
