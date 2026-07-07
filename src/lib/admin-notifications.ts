import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/logger";

const FUNCTION_NAME = "admin-notification-recipients";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AdminNotificationRecipientsResponse = {
  emails: string[];
};

export type AdminNotificationMutationResponse = {
  ok: true;
  emails: string[];
};

export type AdminNotificationMutationResult =
  | { success: true; emails: string[] }
  | { success: false; message: string };

export interface AdminNotificationsText {
  breadcrumbDashboard: string;
  breadcrumbCurrent: string;
  title: string;
  subtitle: string;
  metrics: {
    total: string;
    totalDescription: string;
  };
  filters: {
    searchPlaceholder: string;
  };
  columns: {
    email: string;
    actions: string;
  };
  actions: {
    add: string;
    remove: string;
  };
  empty: string;
  loading: string;
  addDialog: {
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
    addSuccessTitle: string;
    addSuccessDescription: string;
    removeSuccessTitle: string;
    errorTitle: string;
    errorAlreadyRecipient: string;
    errorInvalidEmail: string;
    errorLastRecipient: string;
    errorGeneric: string;
  };
}

export const isValidNotificationEmail = (raw: string): boolean => {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0) return false;
  return EMAIL_REGEX.test(trimmed);
};

export const normalizeNotificationEmail = (raw: string): string => raw.trim().toLowerCase();

export const sortRecipients = (emails: string[]): string[] =>
  [...emails].sort((a, b) => a.localeCompare(b));

export const filterRecipients = (emails: string[], query: string): string[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return emails;
  return emails.filter((email) => email.toLowerCase().includes(normalized));
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
    throw new Error("Empty response from admin-notification-recipients");
  }
  return data;
};

export const fetchRecipients = async (): Promise<string[]> => {
  const response = await invokeFunction<AdminNotificationRecipientsResponse>({ method: "GET" });
  return sortRecipients(response.emails ?? []);
};

export const addRecipient = async (
  email: string,
): Promise<AdminNotificationMutationResult> => {
  const normalized = normalizeNotificationEmail(email);
  if (!isValidNotificationEmail(normalized)) {
    return { success: false, message: "Invalid email format" };
  }
  try {
    const response = await invokeFunction<AdminNotificationMutationResponse>({
      method: "POST",
      body: { email: normalized },
    });
    return { success: true, emails: sortRecipients(response.emails ?? []) };
  } catch (error) {
    return { success: false, message: parseError(error, "Failed to add recipient") };
  }
};

export const removeRecipient = async (
  email: string,
): Promise<AdminNotificationMutationResult> => {
  const normalized = normalizeNotificationEmail(email);
  try {
    const response = await invokeFunction<AdminNotificationMutationResponse>({
      method: "DELETE",
      body: { email: normalized },
    });
    return { success: true, emails: sortRecipients(response.emails ?? []) };
  } catch (error) {
    return { success: false, message: parseError(error, "Failed to remove recipient") };
  }
};
