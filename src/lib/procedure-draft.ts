const PROCEDURE_DRAFT_KEY = "procedure-start-draft";

export type ProcedureDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  countryCode: string;
};

const isBrowser = typeof window !== "undefined";

export const loadProcedureDraft = (): ProcedureDraft | null => {
  if (!isBrowser) {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(PROCEDURE_DRAFT_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as
      | (Partial<ProcedureDraft> & { name?: string | null })
      | null;
    if (!parsed) {
      return null;
    }

    const legacyNameParts = (parsed.name ?? "").trim().split(/\s+/).filter(Boolean);
    const legacyFirstName =
      legacyNameParts.length > 1 ? legacyNameParts.slice(0, -1).join(" ") : legacyNameParts[0] ?? "";
    const legacyLastName =
      legacyNameParts.length > 1 ? legacyNameParts[legacyNameParts.length - 1] : "";

    return {
      firstName: parsed.firstName ?? legacyFirstName,
      lastName: parsed.lastName ?? legacyLastName,
      email: parsed.email ?? "",
      phone: parsed.phone ?? "",
      message: parsed.message ?? "",
      countryCode: parsed.countryCode ?? "+237",
    };
  } catch {
    return null;
  }
};

export const saveProcedureDraft = (draft: ProcedureDraft) => {
  if (!isBrowser) {
    return;
  }

  window.sessionStorage.setItem(PROCEDURE_DRAFT_KEY, JSON.stringify(draft));
};

export const clearProcedureDraft = () => {
  if (!isBrowser) {
    return;
  }

  window.sessionStorage.removeItem(PROCEDURE_DRAFT_KEY);
};
