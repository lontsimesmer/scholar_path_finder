import { describe, expect, it } from "vitest";

import {
  buildLockedDashboardProfilePayload,
  createStudentProfileFormData,
  sanitizeDashboardRedirect,
} from "@/lib/dashboard";

describe("dashboard helpers", () => {
  it("keeps only internal dashboard redirects", () => {
    expect(sanitizeDashboardRedirect("/checkout?leadId=lead-1")).toBe("/checkout?leadId=lead-1");
    expect(sanitizeDashboardRedirect("https://evil.example/dashboard")).toBeNull();
    expect(sanitizeDashboardRedirect(null)).toBeNull();
  });

  it("creates a locked profile payload only when required identity fields are present", () => {
    const user = { id: "student-1", email: "student@example.com" };
    const validProfile = createStudentProfileFormData({
      id: user.id,
      email: user.email,
      phone_number: "+237674819411",
      first_name: " Amina ",
      last_name: " Talla ",
      birth_date: "2000-01-15",
      profile_locked_at: null,
      profile_validation_comment: "old feedback",
      profile_invalidated_at: "2026-01-01T00:00:00.000Z",
      current_degree: " Licence ",
      target_country: " France ",
      target_program: " Master ",
    });

    expect(buildLockedDashboardProfilePayload({ formData: validProfile, user })).toMatchObject({
      id: user.id,
      email: user.email,
      first_name: "Amina",
      last_name: "Talla",
      birth_date: "2000-01-15",
      profile_validation_comment: null,
      profile_invalidated_at: null,
      current_degree: "Licence",
      target_country: "France",
      target_program: "Master",
    });

    expect(
      buildLockedDashboardProfilePayload({
        formData: { ...validProfile, last_name: " " },
        user,
      }),
    ).toBeNull();
  });
});
