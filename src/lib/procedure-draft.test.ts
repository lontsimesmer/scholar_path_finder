import { beforeEach, describe, expect, it } from "vitest";

import { clearProcedureDraft, loadProcedureDraft, saveProcedureDraft, type ProcedureDraft } from "@/lib/procedure-draft";

const draft: ProcedureDraft = {
  countryCode: "+237",
  email: "student@example.com",
  firstName: "Amina",
  lastName: "Talla",
  message: "Je veux demarrer la procedure",
  phone: "612345678",
};

describe("procedure draft storage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("saves, loads, and clears a draft from session storage", () => {
    saveProcedureDraft(draft);
    expect(loadProcedureDraft()).toEqual(draft);

    clearProcedureDraft();
    expect(loadProcedureDraft()).toBeNull();
  });

  it("supports legacy full-name drafts", () => {
    window.sessionStorage.setItem(
      "procedure-start-draft",
      JSON.stringify({
        email: "legacy@example.com",
        name: "Amina Talla",
      }),
    );

    expect(loadProcedureDraft()).toEqual({
      countryCode: "+237",
      email: "legacy@example.com",
      firstName: "Amina",
      lastName: "Talla",
      message: "",
      phone: "",
    });
  });

  it("returns null for malformed draft JSON", () => {
    window.sessionStorage.setItem("procedure-start-draft", "{");

    expect(loadProcedureDraft()).toBeNull();
  });
});
