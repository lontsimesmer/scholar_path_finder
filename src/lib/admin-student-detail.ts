export type AdminStudentActivityType =
  | "profile_updated"
  | "profile_correction_requested"
  | "application_status_updated"
  | "document_updated"
  | "internal_note_added";

export interface AdminStudentInternalNote {
  id: string;
  student_id: string;
  admin_email: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface AdminStudentActivityLog {
  id: string;
  student_id: string;
  application_id: string | null;
  document_id: string | null;
  admin_email: string;
  action_type: AdminStudentActivityType;
  action_label: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AdminStudentDetailText {
  notesTitle: string;
  notesDescription: string;
  notePlaceholder: string;
  addNote: string;
  noteAdded: string;
  noNotes: string;
  historyTitle: string;
  historyDescription: string;
  noHistory: string;
  historyActions: Record<AdminStudentActivityType, string>;
  applicationStatusChangedSummary: string;
  unknownStatus: string;
}

const getStatusLabel = (
  value: unknown,
  statusLabels: Record<string, string>,
  fallback: string,
) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  return statusLabels[value] || value;
};

export const getAdminStudentActivityDescription = (
  activity: AdminStudentActivityLog,
  text: Pick<AdminStudentDetailText, "applicationStatusChangedSummary" | "unknownStatus">,
  applicationStatusLabels: Record<string, string>,
) => {
  if (activity.action_type === "application_status_updated") {
    const previousStatus = getStatusLabel(
      activity.details.previousStatus,
      applicationStatusLabels,
      text.unknownStatus,
    );
    const newStatus = getStatusLabel(
      activity.details.newStatus,
      applicationStatusLabels,
      text.unknownStatus,
    );

    return text.applicationStatusChangedSummary
      .replace("{from}", previousStatus)
      .replace("{to}", newStatus);
  }

  const summary = typeof activity.details.summary === "string" ? activity.details.summary.trim() : "";
  return summary || null;
};
