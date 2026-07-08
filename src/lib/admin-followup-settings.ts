import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/logger";

const FUNCTION_NAME = "admin-followup-settings";

export type FollowupConfigDto = {
  enabled: boolean;
  max_follow_ups: number;
  interval_hours: number;
};

export type AdminFollowupSettingsResponse = {
  config: FollowupConfigDto;
  defaults: FollowupConfigDto;
};

export type AdminFollowupSettingsMutationResponse = {
  ok: true;
  config: FollowupConfigDto;
};

export type AdminFollowupSettingsResult =
  | { success: true; config: FollowupConfigDto; defaults?: FollowupConfigDto }
  | { success: false; message: string };

export interface AdminFollowupSettingsText {
  breadcrumbDashboard: string;
  breadcrumbCurrent: string;
  title: string;
  subtitle: string;
  cardTitle: string;
  cardDescription: string;
  enabledLabel: string;
  enabledDescription: string;
  maxFollowUpsLabel: string;
  maxFollowUpsHelper: string;
  intervalHoursLabel: string;
  intervalHoursHelper: string;
  saveButton: string;
  savingButton: string;
  resetButton: string;
  cronNote: string;
  toasts: {
    loadErrorTitle: string;
    saveSuccessTitle: string;
    saveSuccessDescription: string;
    saveErrorTitle: string;
    invalidValues: string;
  };
}

const invokeFunction = async <T>(options: {
  method: "GET" | "POST";
  body?: Record<string, unknown>;
}): Promise<T> => {
  const { data, error } = await supabase.functions.invoke<T>(FUNCTION_NAME, {
    method: options.method,
    body: options.body,
  });
  if (error) throw error;
  if (!data) throw new Error("Empty response from admin-followup-settings");
  return data;
};

export const fetchFollowupSettings = async (): Promise<AdminFollowupSettingsResult> => {
  try {
    const response = await invokeFunction<AdminFollowupSettingsResponse>({ method: "GET" });
    return { success: true, config: response.config, defaults: response.defaults };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error, "Failed to load follow-up settings"),
    };
  }
};

export const saveFollowupSettings = async (
  config: FollowupConfigDto,
): Promise<AdminFollowupSettingsResult> => {
  try {
    const response = await invokeFunction<AdminFollowupSettingsMutationResponse>({
      method: "POST",
      body: {
        enabled: config.enabled,
        maxFollowUps: config.max_follow_ups,
        intervalHours: config.interval_hours,
      },
    });
    return { success: true, config: response.config };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error, "Failed to save follow-up settings"),
    };
  }
};

export const isValidFollowupConfig = (config: FollowupConfigDto): boolean => {
  if (typeof config.enabled !== "boolean") return false;
  const max = Number(config.max_follow_ups);
  const interval = Number(config.interval_hours);
  if (!Number.isFinite(max) || max < 1 || max > 60) return false;
  if (!Number.isFinite(interval) || interval < 1 || interval > 24 * 30) return false;
  return true;
};
