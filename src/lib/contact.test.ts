import { describe, expect, it } from "vitest";

import { initialContactFormData, mergeContactDraft } from "@/lib/contact";

describe("contact helpers", () => {
  it("exposes an empty initial contact form", () => {
    expect(initialContactFormData).toEqual({
      email: "",
      firstName: "",
      lastName: "",
      message: "",
      phone: "",
    });
  });

  it("merges a procedure draft while preserving stronger authenticated identity", () => {
    expect(
      mergeContactDraft({
        current: {
          email: "",
          firstName: "",
          lastName: "",
          message: "Message courant",
          phone: "",
        },
        draft: {
          countryCode: "+237",
          email: "draft@example.com",
          firstName: "Draft",
          lastName: "User",
          message: "Message draft",
          phone: "612345678",
        },
        profileIdentity: {
          firstName: "Amina",
          lastName: "Talla",
        },
        userEmail: "amina@example.com",
      }),
    ).toEqual({
      email: "amina@example.com",
      firstName: "Amina",
      lastName: "Talla",
      message: "Message draft",
      phone: "612345678",
    });
  });
});
