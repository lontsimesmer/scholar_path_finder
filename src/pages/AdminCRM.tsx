import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "@/components/Header";
import { AdminWorkspaceHeader } from "@/components/admin/AdminWorkspaceHeader";
import { AdminCRMEditDialog } from "@/components/admin/crm/AdminCRMEditDialog";
import { AdminCRMFilters } from "@/components/admin/crm/AdminCRMFilters";
import { AdminCRMMetrics } from "@/components/admin/crm/AdminCRMMetrics";
import { AdminCRMTable } from "@/components/admin/crm/AdminCRMTable";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminCRM } from "@/hooks/use-admin-crm";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import { ADMIN_DASHBOARD_PATH, getAdminSession } from "@/lib/admin-session";
import {
  AdminCRMText,
  buildAdminCRMMetrics,
  filterAdminCRMStudents,
  getTargetCountries,
} from "@/lib/admin-crm";
import { createLogger } from "@/lib/logger";

const logger = createLogger("AdminCRMPage");

const applicationStatuses = [
  "consultation_paid",
  "profile_evaluation",
  "university_selection",
  "application_submitted",
  "admission_received",
  "visa_processing",
  "visa_granted",
  "completed",
];

const AdminCRM = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const adminCRMText = t.adminCRM as AdminCRMText;
  const applicationStatusLabels = t.dashboard.status as Record<string, string>;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [profileFilter, setProfileFilter] = useState<"all" | "validated" | "correction_requested" | "pending">("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "pending" | "unpaid" | "refunded" | "none">("all");
  const [documentFilter, setDocumentFilter] = useState<"all" | "pending" | "approved" | "rejected" | "none">("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const {
    editingStudent,
    fetchStudents,
    formData,
    handleEditStudent,
    handleRequestProfileCorrection,
    handleSaveStudent,
    isLoading,
    isSaving,
    setEditingStudent,
    setFormData,
    students,
    updateStatus,
  } = useAdminCRM({
    locale: language,
    noEmail: adminCRMText.noEmail,
    text: {
      correctionCommentRequiredDescription: adminCRMText.correctionCommentRequiredDescription,
      correctionCommentRequiredTitle: adminCRMText.correctionCommentRequiredTitle,
      correctionRequestedSuccess: adminCRMText.correctionRequestedSuccess,
      documentUpdated: adminCRMText.documentUpdated,
      documentRequestCreated: adminCRMText.documentRequestCreated,
      documentRequestRequiredDescription: adminCRMText.documentRequestRequiredDescription,
      documentRequestRequiredTitle: adminCRMText.documentRequestRequiredTitle,
      statusUpdated: adminCRMText.statusUpdated,
      studentUpdated: adminCRMText.studentUpdated,
      updateFailed: adminCRMText.updateFailed,
    },
    toast,
  });

  useEffect(() => {
    let isActive = true;

    const loadAdminCRM = async () => {
      const session = await getAdminSession();
      if (!session) {
        logger.warn("Admin CRM requires authentication");
        navigate("/login?redirect=/admin/crm", { replace: true });
        return;
      }

      logger.info("Admin CRM access granted", { userId: session.user.id });

      if (isActive) {
        await fetchStudents();
      }
    };

    void loadAdminCRM();

    return () => {
      isActive = false;
    };
  }, [fetchStudents, navigate]);

  const filteredStudents = useMemo(
    () =>
      filterAdminCRMStudents({
        countryFilter,
        documentFilter,
        paymentFilter,
        profileFilter,
        query: searchQuery,
        statusFilter,
        students,
      }),
    [countryFilter, documentFilter, paymentFilter, profileFilter, searchQuery, statusFilter, students],
  );

  const targetCountries = useMemo(() => getTargetCountries(students), [students]);
  const metrics = useMemo(() => buildAdminCRMMetrics(students), [students]);
  const navItems = [
    { href: "/admin", label: adminCRMText.breadcrumbDashboard },
    { href: "/admin/crm", label: adminCRMText.breadcrumbCurrent },
    { href: "/admin/leads", label: t.adminLeads.breadcrumbCurrent },
    { href: "/admin/payments", label: t.adminPayments.breadcrumbCurrent },
    { href: "/admin/blog", label: t.adminBlog.breadcrumbCurrent },
  ];
  const highlights = [
    {
      label: adminCRMText.metrics.totalStudents,
      value: metrics.totalStudents,
    },
    {
      label: adminCRMText.metrics.validatedProfiles,
      value: metrics.validatedProfiles,
      tone: "success" as const,
    },
    {
      label: adminCRMText.metrics.pendingDocuments,
      value: metrics.pendingDocuments,
      tone: "warning" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-secondary/10">
      <Header />

      <main className="pb-20 pt-32">
        <div className="section-container space-y-8">
          <AdminWorkspaceHeader
            dashboardHref={ADMIN_DASHBOARD_PATH}
            dashboardLabel={adminCRMText.breadcrumbDashboard}
            currentLabel={adminCRMText.breadcrumbCurrent}
            title={adminCRMText.title}
            subtitle={adminCRMText.subtitle}
            navItems={navItems}
            highlights={highlights}
          />

          <AdminCRMMetrics metrics={metrics} text={adminCRMText} />

          <Card className="rounded-[2rem] border-border/40 bg-white shadow-strong">
            <CardContent className="space-y-6 p-6 pt-6 md:pt-6">
              <AdminCRMFilters
                applicationStatusLabels={applicationStatusLabels}
                applicationStatuses={applicationStatuses}
                countryFilter={countryFilter}
                documentFilter={documentFilter}
                paymentFilter={paymentFilter}
                profileFilter={profileFilter}
                searchQuery={searchQuery}
                setCountryFilter={setCountryFilter}
                setDocumentFilter={setDocumentFilter}
                setPaymentFilter={setPaymentFilter}
                setProfileFilter={setProfileFilter}
                setSearchQuery={setSearchQuery}
                setStatusFilter={setStatusFilter}
                statusFilter={statusFilter}
                targetCountries={targetCountries}
                text={adminCRMText}
              />

              <AdminCRMTable
                applicationStatusLabels={applicationStatusLabels}
                applicationStatuses={applicationStatuses}
                isLoading={isLoading}
                onEdit={handleEditStudent}
                onOpenStudent={(student) => navigate(`/admin/students/${encodeURIComponent(student.id)}`)}
                onUpdateStatus={updateStatus}
                students={filteredStudents}
                text={adminCRMText}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      <AdminCRMEditDialog
        formData={formData}
        isOpen={Boolean(editingStudent)}
        isSaving={isSaving}
        onClose={() => setEditingStudent(null)}
        onRequestCorrection={handleRequestProfileCorrection}
        onSave={handleSaveStudent}
        setFormData={setFormData}
        student={editingStudent}
        text={adminCRMText}
      />
    </div>
  );
};

export default AdminCRM;
