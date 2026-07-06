import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/logger";

const FUNCTION_NAME = "admin-team";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AdminTeamMember = {
  email: string;
  created_at: string;
};

export type AdminTeamResponse = {
  admins: AdminTeamMember[];
};

export type AdminTeamMutationResponse = {
  ok: true;
  admins: AdminTeamMember[];
};

export type AdminTeamMutationResult =
  | { success: true; admins: AdminTeamMember[] }
  | { success: false; message: string };

export interface AdminTeamText {
  breadcrumbDashboard: string;
  breadcrumbCurrent: string;
  title: string;
  subtitle: string;
  metrics: {
    total: string;
    totalDescription: string;
    invited: string;
    invitedDescription: string;
  };
  filters: {
    searchPlaceholder: string;
  };
  columns: {
    email: string;
    createdAt: string;
    actions: string;
  };
  badges: {
    you: string;
  };
  actions: {
    invite: string;
    remove: string;
  };
  empty: string;
  loading: string;
  inviteDialog: {
    title: string;
    description: string;
    emailLabel: string;
    emailPlaceholder: string;
    submit: string;
    submitting: string;
    cancel: string;
    invalidEmail: string;
  };
  removeDialog: {
    title: string;
    description: string;
    confirm: string;
    cancel: string;
  };
  toasts: {
    inviteSuccessTitle: string;
    inviteSuccessDescription: string;
    removeSuccessTitle: string;
    errorTitle: string;
    errorAlreadyAdmin: string;
    errorInvalidEmail: string;
    errorSelfRemove: string;
    errorRateLimit: string;
    errorGeneric: string;
  };
}

export const isValidAdminEmail = (raw: string): boolean => {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0) return false;
  return EMAIL_REGEX.test(trimmed);
};

export const normalizeAdminEmail = (raw: string): string => raw.trim().toLowerCase();

export const sortAdmins = (admins: AdminTeamMember[]): AdminTeamMember[] =>
  [...admins].sort((a, b) => a.created_at.localeCompare(b.created_at));

export const filterAdmins = (
  admins: AdminTeamMember[],
  query: string,
): AdminTeamMember[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return admins;
  return admins.filter((admin) => admin.email.toLowerCase().includes(normalized));
};

const parseError = (error: unknown, fallback: string): string => {
  const message = getErrorMessage(error, fallback);
  return message || fallback;
};

const invokeFunction = async <T>(options: {
  method: "GET" | "POST" | "DELETE";
  body?: Record<string, unknown>;
}): Promise<T> => {
  const { data, error } = await supabase.functions.invoke<T>(FUNCTION_NAME, {
    method: options.method,
    body: options.body,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Empty response from admin-team");
  }

  return data;
};

export const fetchAdmins = async (): Promise<AdminTeamMember[]> => {
  const response = await invokeFunction<AdminTeamResponse>({ method: "GET" });
  return sortAdmins(response.admins ?? []);
};

export const inviteAdmin = async (email: string): Promise<AdminTeamMutationResult> => {
  const normalized = normalizeAdminEmail(email);
  if (!isValidAdminEmail(normalized)) {
    return { success: false, message: "Invalid email format" };
  }
  try {
    const response = await invokeFunction<AdminTeamMutationResponse>({
      method: "POST",
      body: { email: normalized },
    });
    return { success: true, admins: sortAdmins(response.admins ?? []) };
  } catch (error) {
    return { success: false, message: parseError(error, "Failed to invite admin") };
  }
};

export const removeAdmin = async (email: string): Promise<AdminTeamMutationResult> => {
  const normalized = normalizeAdminEmail(email);
  try {
    const response = await invokeFunction<AdminTeamMutationResponse>({
      method: "DELETE",
      body: { email: normalized },
    });
    return { success: true, admins: sortAdmins(response.admins ?? []) };
  } catch (error) {
    return { success: false, message: parseError(error, "Failed to remove admin") };
  }
};
