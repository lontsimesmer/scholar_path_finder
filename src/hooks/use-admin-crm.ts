import { FormEvent, useCallback, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { logAdminStudentActivity } from "@/lib/admin-student-detail-service";
import {
  AdminCRMFormData,
  AdminCRMStudent,
  AdminCRMText,
  LeadSummary,
  PaymentTransactionSummary,
  StudentApplicationSummary,
  StudentDocument,
  StudentDocumentRequest,
  StudentProfileSummary,
  buildDocumentSummary,
  buildPaymentSummary,
  createAdminCRMFormData,
} from "@/lib/admin-crm";
import { createLogger, getErrorMessage } from "@/lib/logger";
import { readSupabaseFunctionError } from "@/lib/supabase-function-errors";
import { getStudentProfileReviewStatus } from "@/lib/student-profile";

const logger = createLogger("useAdminCRM");
const untypedSupabase = supabase as unknown as SupabaseClient;

interface UseAdminCRMOptions {
  locale?: string;
  noEmail: string;
  text: Pick<
    AdminCRMText,
    | "correctionCommentRequiredDescription"
    | "correctionCommentRequiredTitle"
    | "correctionRequestedSuccess"
    | "documentRequestCreated"
    | "documentRequestRequiredDescription"
    | "documentRequestRequiredTitle"
    | "documentUpdated"
    | "studentUpdated"
    | "statusUpdated"
    | "updateFailed"
  >;
  toast: (options: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
}

export const useAdminCRM = ({ locale = "fr", noEmail, text, toast }: UseAdminCRMOptions) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mutationVersion, setMutationVersion] = useState(0);
  const [students, setStudents] = useState<AdminCRMStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<AdminCRMStudent | null>(null);
  const [editingStudent, setEditingStudent] = useState<AdminCRMStudent | null>(null);
  const [studentDocs, setStudentDocs] = useState<StudentDocument[]>([]);
  const [studentDocumentRequests, setStudentDocumentRequests] = useState<StudentDocumentRequest[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [isRequestingDocument, setIsRequestingDocument] = useState(false);
  const [formData, setFormData] = useState<AdminCRMFormData>(createAdminCRMFormData());

  const bumpMutationVersion = useCallback(() => {
    setMutationVersion((current) => current + 1);
  }, []);

  const appendActivityLog = useCallback(
    async (
      studentId: string,
      actionType: "profile_updated" | "profile_correction_requested" | "application_status_updated" | "document_updated",
      details: Record<string, unknown>,
      options?: { applicationId?: string | null; documentId?: string | null },
    ) => {
      try {
        await logAdminStudentActivity({
          studentId,
          actionType,
          applicationId: options?.applicationId ?? null,
          documentId: options?.documentId ?? null,
          details,
        });
      } catch (error: unknown) {
        logger.error("Failed to append admin student activity log", {
          studentId,
          actionType,
          message: getErrorMessage(error),
        });
      }
    },
    [],
  );

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    logger.info("Loading admin CRM students");

    try {
      const [appsResponse, profilesResponse, documentsResponse, leadsResponse, paymentsResponse] =
        await Promise.all([
          supabase.from("student_applications").select("id, student_id, status, notes, updated_at"),
          supabase
            .from("student_profiles")
            .select(
              "id, email, first_name, last_name, birth_date, profile_locked_at, profile_validation_comment, profile_invalidated_at, target_country, target_program, current_degree",
            ),
          supabase
            .from("student_documents")
            .select("id, title, file_path, status, student_id, admin_feedback"),
          supabase.from("leads").select("id, email, name, status, payment_status, created_at, updated_at"),
          supabase
            .from("payment_transactions")
            .select("id, student_id, transaction_id, amount, currency, local_status, channel, created_at"),
        ]);

      const firstError =
        appsResponse.error ||
        profilesResponse.error ||
        documentsResponse.error ||
        leadsResponse.error ||
        paymentsResponse.error;

      if (firstError) {
        throw firstError;
      }

      const apps = (appsResponse.data as (StudentApplicationSummary & { student_id: string })[] | null) ?? [];
      const profiles = (profilesResponse.data as StudentProfileSummary[] | null) ?? [];
      const documents = (documentsResponse.data as StudentDocument[] | null) ?? [];
      const leads = ((leadsResponse.data as LeadSummary[] | null) ?? []).sort(
        (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
      );
      const payments = (paymentsResponse.data as PaymentTransactionSummary[] | null) ?? [];

      const profilesById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
      const documentsByStudentId = documents.reduce<Record<string, StudentDocument[]>>((acc, document) => {
        const current = acc[document.student_id] ?? [];
        current.push(document);
        acc[document.student_id] = current;
        return acc;
      }, {});
      const paymentsByStudentId = payments.reduce<Record<string, PaymentTransactionSummary[]>>(
        (acc, payment) => {
          const current = acc[payment.student_id] ?? [];
          current.push(payment);
          acc[payment.student_id] = current;
          return acc;
        },
        {},
      );
      const leadsByEmail = leads.reduce<Record<string, LeadSummary>>((acc, lead) => {
        const normalizedEmail = lead.email.toLowerCase();
        if (!acc[normalizedEmail]) {
          acc[normalizedEmail] = lead;
        }
        return acc;
      }, {});

      const mappedStudents: AdminCRMStudent[] = apps.map((app) => {
        const profile = profilesById[app.student_id] ?? null;
        const email = profile?.email || noEmail;
        const lead = profile?.email ? leadsByEmail[profile.email.toLowerCase()] ?? null : null;
        const studentDocuments = documentsByStudentId[app.student_id] ?? [];
        const studentPayments = paymentsByStudentId[app.student_id] ?? [];

        return {
          id: app.student_id,
          email,
          profile,
          application: {
            id: app.id,
            status: app.status,
            notes: app.notes,
            updated_at: app.updated_at,
          },
          lead,
          documentSummary: buildDocumentSummary(studentDocuments),
          paymentSummary: buildPaymentSummary(studentPayments),
        };
      });

      setStudents(mappedStudents);
      logger.info("Admin CRM students loaded", {
        applicationCount: apps.length,
        profileCount: profiles.length,
        mappedCount: mappedStudents.length,
      });
    } catch (error) {
      logger.error("Failed to load admin CRM students", {
        message: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [noEmail]);

  const handleEditStudent = useCallback((student: AdminCRMStudent) => {
    setEditingStudent(student);
    setFormData(createAdminCRMFormData(student));
  }, []);

  const handleSaveStudent = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!editingStudent) {
        return;
      }

      setIsSaving(true);
      logger.info("Saving admin CRM student changes", { studentId: editingStudent.id });

      try {
        const firstName = formData.first_name.trim();
        const lastName = formData.last_name.trim();
        const birthDate = formData.birth_date.trim();
        const isCorrectionRequested =
          getStudentProfileReviewStatus(editingStudent.profile) === "correction_requested";

        const { error: profileError } = await supabase
          .from("student_profiles")
          .upsert(
            {
              id: editingStudent.id,
              email: editingStudent.email === noEmail ? null : editingStudent.email,
              first_name: firstName || null,
              last_name: lastName || null,
              birth_date: birthDate || null,
              profile_locked_at: isCorrectionRequested
                ? null
                : editingStudent.profile?.profile_locked_at ?? null,
              profile_validation_comment: isCorrectionRequested
                ? formData.profile_validation_comment.trim() || null
                : null,
              profile_invalidated_at: isCorrectionRequested
                ? editingStudent.profile?.profile_invalidated_at ?? null
                : null,
              target_country: formData.target_country.trim() || null,
              target_program: formData.target_program.trim() || null,
              current_degree: formData.current_degree.trim() || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          );

        if (profileError) {
          throw profileError;
        }

        if (editingStudent.application) {
          const { error: appError } = await supabase
            .from("student_applications")
            .update({ notes: formData.general_notes })
            .eq("id", editingStudent.application.id);

          if (appError) {
            throw appError;
          }
        }

        toast({ title: text.studentUpdated });
        setEditingStudent(null);
        logger.info("Admin CRM student changes saved", { studentId: editingStudent.id });
        await appendActivityLog(
          editingStudent.id,
          "profile_updated",
          {
            summary: "Student profile, academic targets, or student-facing notes updated.",
            targetCountry: formData.target_country.trim() || null,
            targetProgram: formData.target_program.trim() || null,
          },
          { applicationId: editingStudent.application?.id ?? null },
        );
        bumpMutationVersion();
        await fetchStudents();
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        logger.error("Failed to save admin CRM student changes", {
          studentId: editingStudent.id,
          message,
        });
        toast({ title: text.updateFailed, description: message, variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    },
    [
      appendActivityLog,
      bumpMutationVersion,
      editingStudent,
      fetchStudents,
      formData,
      noEmail,
      text.studentUpdated,
      text.updateFailed,
      toast,
    ],
  );

  const handleRequestProfileCorrection = useCallback(async () => {
    if (!editingStudent) {
      return;
    }

    const correctionComment = formData.profile_validation_comment.trim();
    if (!correctionComment) {
      toast({
        title: text.correctionCommentRequiredTitle,
        description: text.correctionCommentRequiredDescription,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    logger.info("Requesting student profile correction", { studentId: editingStudent.id });

    try {
      const firstName = formData.first_name.trim();
      const lastName = formData.last_name.trim();
      const birthDate = formData.birth_date.trim();

      const { error } = await supabase
        .from("student_profiles")
        .upsert(
          {
            id: editingStudent.id,
            email: editingStudent.email === noEmail ? null : editingStudent.email,
            first_name: firstName || null,
            last_name: lastName || null,
            birth_date: birthDate || null,
            profile_locked_at: null,
            profile_validation_comment: correctionComment,
            profile_invalidated_at: new Date().toISOString(),
            target_country: formData.target_country.trim() || null,
            target_program: formData.target_program.trim() || null,
            current_degree: formData.current_degree.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

      if (error) {
        throw error;
      }

      toast({ title: text.correctionRequestedSuccess });
      setEditingStudent(null);
      logger.info("Student profile correction requested", { studentId: editingStudent.id });
      await appendActivityLog(
        editingStudent.id,
        "profile_correction_requested",
        {
          summary: correctionComment,
        },
        { applicationId: editingStudent.application?.id ?? null },
      );
      bumpMutationVersion();
      await fetchStudents();
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logger.error("Failed to request student profile correction", {
        studentId: editingStudent.id,
        message,
      });
      toast({ title: text.updateFailed, description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [
    appendActivityLog,
    bumpMutationVersion,
    editingStudent,
    fetchStudents,
    formData,
    noEmail,
    text.correctionCommentRequiredDescription,
    text.correctionCommentRequiredTitle,
    text.correctionRequestedSuccess,
    text.updateFailed,
    toast,
  ]);

  const updateStatus = useCallback(
    async (appId: string, newStatus: string) => {
      const currentStudent = students.find((student) => student.application?.id === appId) ?? null;
      const previousStatus = currentStudent?.application?.status ?? null;
      logger.info("Updating student application status", { appId, newStatus });

      const { error } = await supabase
        .from("student_applications")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", appId);

      if (error) {
        logger.error("Failed to update student application status", {
          appId,
          newStatus,
          message: error.message,
        });
        toast({ title: text.updateFailed, description: error.message, variant: "destructive" });
        return;
      }

      logger.info("Student application status updated", { appId, newStatus });
      toast({ title: text.statusUpdated });
      if (currentStudent) {
        await appendActivityLog(
          currentStudent.id,
          "application_status_updated",
          {
            previousStatus,
            newStatus,
          },
          { applicationId: appId },
        );
      }
      bumpMutationVersion();
      await fetchStudents();
    },
    [appendActivityLog, bumpMutationVersion, fetchStudents, students, text.statusUpdated, text.updateFailed, toast],
  );

  const viewDocuments = useCallback(async (student: AdminCRMStudent) => {
    setSelectedStudent(student);
    setIsDocsLoading(true);
    logger.info("Loading student documents in admin CRM", { studentId: student.id });

    const [documentsResponse, requestsResponse] = await Promise.all([
      supabase
        .from("student_documents")
        .select("*")
        .eq("student_id", student.id),
      untypedSupabase
        .from("student_document_requests")
        .select("*")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false }),
    ]);

    if (!documentsResponse.error) {
      logger.info("Student documents loaded in admin CRM", {
        studentId: student.id,
        documentCount: documentsResponse.data?.length ?? 0,
      });
      setStudentDocs((documentsResponse.data as StudentDocument[] | null) ?? []);
    } else {
      logger.error("Failed to load student documents in admin CRM", {
        studentId: student.id,
        message: documentsResponse.error.message,
      });
    }

    if (!requestsResponse.error) {
      setStudentDocumentRequests((requestsResponse.data as StudentDocumentRequest[] | null) ?? []);
    } else {
      logger.error("Failed to load student document requests in admin CRM", {
        studentId: student.id,
        message: requestsResponse.error.message,
      });
    }

    setIsDocsLoading(false);
  }, []);

  const updateDoc = useCallback(
    async (docId: string, updates: Partial<StudentDocument>) => {
      logger.info("Updating student document from admin CRM", {
        docId,
        updatedFields: Object.keys(updates),
      });

      const { error } = await supabase.from("student_documents").update(updates).eq("id", docId);

      if (!error) {
        logger.info("Student document updated from admin CRM", { docId });
        toast({ title: text.documentUpdated });
        const currentDocument = studentDocs.find((document) => document.id === docId) ?? null;
        const currentStudentId = selectedStudent?.id ?? currentDocument?.student_id ?? null;
        if (currentStudentId) {
          await appendActivityLog(
            currentStudentId,
            "document_updated",
            {
              summary: `Document updated: ${currentDocument?.title || docId}.`,
              updatedFields: Object.keys(updates),
              nextStatus: updates.status ?? currentDocument?.status ?? null,
            },
            { documentId: docId, applicationId: selectedStudent?.application?.id ?? null },
          );
        }
        bumpMutationVersion();

        if (selectedStudent) {
          await viewDocuments(selectedStudent);
        }

        return;
      }

      logger.error("Failed to update student document from admin CRM", {
        docId,
        message: error.message,
      });
      toast({ title: text.updateFailed, description: error.message, variant: "destructive" });
    },
    [appendActivityLog, bumpMutationVersion, selectedStudent, studentDocs, text.documentUpdated, text.updateFailed, toast, viewDocuments],
  );

  const createDocumentRequest = useCallback(
    async (title: string, description: string) => {
      const normalizedTitle = title.trim();
      if (!selectedStudent || !normalizedTitle) {
        toast({
          title: text.documentRequestRequiredTitle,
          description: text.documentRequestRequiredDescription,
          variant: "destructive",
        });
        return;
      }

      setIsRequestingDocument(true);

      try {
        const { error } = await supabase.functions.invoke("create-document-request", {
          body: {
            studentId: selectedStudent.id,
            applicationId: selectedStudent.application?.id ?? null,
            title: normalizedTitle,
            description: description.trim() || null,
            locale,
          },
        });

        if (error) {
          const functionError = await readSupabaseFunctionError(error);
          throw new Error(functionError.message);
        }

        toast({ title: text.documentRequestCreated });
        await appendActivityLog(
          selectedStudent.id,
          "document_updated",
          {
            summary: normalizedTitle,
            documentRequestCreated: true,
          },
          { applicationId: selectedStudent.application?.id ?? null },
        );
        bumpMutationVersion();
        await viewDocuments(selectedStudent);
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        logger.error("Failed to create student document request", {
          studentId: selectedStudent.id,
          message,
        });
        toast({ title: text.updateFailed, description: message, variant: "destructive" });
      } finally {
        setIsRequestingDocument(false);
      }
    },
    [
      appendActivityLog,
      bumpMutationVersion,
      locale,
      selectedStudent,
      text.documentRequestCreated,
      text.documentRequestRequiredDescription,
      text.documentRequestRequiredTitle,
      text.updateFailed,
      toast,
      viewDocuments,
    ],
  );

  const getFileUrl = useCallback(async (path: string) => {
    logger.info("Creating signed URL for student document", { path });
    const { data } = await supabase.storage.from("student-documents").createSignedUrl(path, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  }, []);

  return {
    editingStudent,
    fetchStudents,
    formData,
    getFileUrl,
    createDocumentRequest,
    handleEditStudent,
    handleRequestProfileCorrection,
    handleSaveStudent,
    isDocsLoading,
    isLoading,
    isRequestingDocument,
    isSaving,
    selectedStudent,
    setEditingStudent,
    setFormData,
    setSelectedStudent,
    setStudentDocs,
    setStudentDocumentRequests,
    studentDocs,
    studentDocumentRequests,
    students,
    mutationVersion,
    updateDoc,
    updateStatus,
    viewDocuments,
  };
};
