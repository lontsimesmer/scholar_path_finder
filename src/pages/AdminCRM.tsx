import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { AdminCRMEditDialog } from "@/components/admin/crm/AdminCRMEditDialog";
import { AdminCRMFilters } from "@/components/admin/crm/AdminCRMFilters";
import { AdminCRMMetrics } from "@/components/admin/crm/AdminCRMMetrics";
import { AdminCRMTable } from "@/components/admin/crm/AdminCRMTable";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminCRM } from "@/hooks/use-admin-crm";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/language";
import { getAdminSession } from "@/lib/admin-session";
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

  return (
    <AdminLayout title={adminCRMText.title} subtitle={adminCRMText.subtitle}>
      <div className="space-y-6">
        <AdminCRMMetrics metrics={metrics} text={adminCRMText} />

        <Card className="rounded-2xl border-border/40 bg-white shadow-soft">
          <CardContent className="space-y-6 p-6 pt-6 md:p-7 md:pt-7">
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
    </AdminLayout>
  );
};

export default AdminCRM;
