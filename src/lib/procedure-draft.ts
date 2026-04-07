const PROCEDURE_DRAFT_KEY = "procedure-start-draft";

export type ProcedureDraft = {
  name: string;
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

    const parsed = JSON.parse(rawValue) as Partial<ProcedureDraft> | null;
    if (!parsed) {
      return null;
    }

    return {
      name: parsed.name ?? "",
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
