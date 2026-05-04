import { describe, expect, it } from "vitest";

import {
  AdminStudentActivityLog,
  getAdminStudentActivityDescription,
} from "@/lib/admin-student-detail";

const createActivity = (
  overrides: Partial<AdminStudentActivityLog>,
): AdminStudentActivityLog => ({
  id: "activity-1",
  student_id: "student-1",
  application_id: null,
  document_id: null,
  admin_email: "admin@example.com",
  action_type: "document_updated",
  action_label: null,
  details: {},
  created_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("getAdminStudentActivityDescription", () => {
  it("translates application status changes with localized status labels", () => {
    const description = getAdminStudentActivityDescription(
      createActivity({
        action_type: "application_status_updated",
        details: {
          previousStatus: "consultation_paid",
          newStatus: "profile_evaluation",
        },
      }),
      {
        applicationStatusChangedSummary: "Statut modifie de {from} vers {to}.",
        unknownStatus: "Statut inconnu",
      },
      {
        consultation_paid: "Consultation payee",
        profile_evaluation: "Evaluation du profil",
      },
    );

    expect(description).toBe("Statut modifie de Consultation payee vers Evaluation du profil.");
  });

  it("returns a trimmed summary for non-status activities", () => {
    expect(
      getAdminStudentActivityDescription(
        createActivity({
          details: {
            summary: "  Document mis a jour.  ",
          },
        }),
        {
          applicationStatusChangedSummary: "{from} -> {to}",
          unknownStatus: "Unknown",
        },
        {},
      ),
    ).toBe("Document mis a jour.");
  });

  it("returns null when there is no useful activity summary", () => {
    expect(
      getAdminStudentActivityDescription(
        createActivity({ details: {} }),
        {
          applicationStatusChangedSummary: "{from} -> {to}",
          unknownStatus: "Unknown",
        },
        {},
      ),
    ).toBeNull();
  });
});
