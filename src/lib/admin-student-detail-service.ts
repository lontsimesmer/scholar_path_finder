import { supabase } from "@/integrations/supabase/client";
import {
  AdminStudentActivityLog,
  AdminStudentActivityType,
  AdminStudentInternalNote,
} from "@/lib/admin-student-detail";

async function getCurrentAdminEmail() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const email = session?.user.email?.trim();
  if (!email) {
    throw new Error("Admin session email is required.");
  }

  return email;
}

export async function fetchAdminStudentNotes(studentId: string) {
  const { data, error } = await supabase
    .from("student_admin_notes")
    .select("id, student_id, admin_email, note, created_at, updated_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data as AdminStudentInternalNote[] | null) ?? [];
}

export async function fetchAdminStudentActivityLogs(studentId: string) {
  const { data, error } = await supabase
    .from("student_admin_activity_logs")
    .select("id, student_id, application_id, document_id, admin_email, action_type, action_label, details, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data as AdminStudentActivityLog[] | null) ?? [];
}

type CreateAdminStudentNoteParams = {
  studentId: string;
  note: string;
};

export async function createAdminStudentNote({ studentId, note }: CreateAdminStudentNoteParams) {
  const adminEmail = await getCurrentAdminEmail();
  const { data, error } = await supabase
    .from("student_admin_notes")
    .insert({
      student_id: studentId,
      admin_email: adminEmail,
      note,
    })
    .select("id, student_id, admin_email, note, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data as AdminStudentInternalNote;
}

type LogAdminStudentActivityParams = {
  studentId: string;
  actionType: AdminStudentActivityType;
  actionLabel?: string | null;
  applicationId?: string | null;
  documentId?: string | null;
  details?: Record<string, unknown>;
};

export async function logAdminStudentActivity({
  studentId,
  actionType,
  actionLabel = null,
  applicationId = null,
  documentId = null,
  details = {},
}: LogAdminStudentActivityParams) {
  const adminEmail = await getCurrentAdminEmail();
  const { error } = await supabase.from("student_admin_activity_logs").insert({
    student_id: studentId,
    application_id: applicationId,
    document_id: documentId,
    admin_email: adminEmail,
    action_type: actionType,
    action_label: actionLabel,
    details,
  });

  if (error) {
    throw error;
  }
}
