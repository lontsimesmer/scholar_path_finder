import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import { createLogger, getErrorMessage } from "./logger.ts";

const logger = createLogger("FOLLOWUP-SETTINGS");

export const FOLLOWUP_CONFIG_KEY = "leads.followup_config";

export type FollowupConfig = {
  enabled: boolean;
  maxFollowUps: number;
  intervalHours: number;
};

export const DEFAULT_FOLLOWUP_CONFIG: FollowupConfig = {
  enabled: true,
  maxFollowUps: 14,
  intervalHours: 24,
};

const MIN_MAX_FOLLOWUPS = 1;
const MAX_MAX_FOLLOWUPS = 60;
const MIN_INTERVAL_HOURS = 1;
const MAX_INTERVAL_HOURS = 24 * 30;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const toPositiveInteger = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallback;
};

const toBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
};

export const parseFollowupConfig = (raw: unknown): FollowupConfig => {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_FOLLOWUP_CONFIG;
  }
  const source = raw as Record<string, unknown>;
  const enabled = toBoolean(source.enabled, DEFAULT_FOLLOWUP_CONFIG.enabled);
  const maxFollowUps = clamp(
    toPositiveInteger(source.max_follow_ups, DEFAULT_FOLLOWUP_CONFIG.maxFollowUps),
    MIN_MAX_FOLLOWUPS,
    MAX_MAX_FOLLOWUPS,
  );
  const intervalHours = clamp(
    toPositiveInteger(source.interval_hours, DEFAULT_FOLLOWUP_CONFIG.intervalHours),
    MIN_INTERVAL_HOURS,
    MAX_INTERVAL_HOURS,
  );
  return { enabled, maxFollowUps, intervalHours };
};

export const serializeFollowupConfig = (config: FollowupConfig) => ({
  enabled: config.enabled,
  max_follow_ups: config.maxFollowUps,
  interval_hours: config.intervalHours,
});

export const loadFollowupConfig = async (
  supabase: SupabaseClient,
): Promise<FollowupConfig> => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", FOLLOWUP_CONFIG_KEY)
      .maybeSingle();
    if (error) {
      logger.warn("Failed to read followup config", { message: error.message });
      return DEFAULT_FOLLOWUP_CONFIG;
    }
    return parseFollowupConfig(data?.value);
  } catch (error: unknown) {
    logger.warn("Unexpected error while loading followup config", {
      message: getErrorMessage(error),
    });
    return DEFAULT_FOLLOWUP_CONFIG;
  }
};

export const saveFollowupConfig = async (
  supabase: SupabaseClient,
  config: FollowupConfig,
  updatedBy?: string | null,
): Promise<FollowupConfig> => {
  const parsed = parseFollowupConfig(serializeFollowupConfig(config));
  const { error } = await supabase.from("app_settings").upsert({
    key: FOLLOWUP_CONFIG_KEY,
    value: serializeFollowupConfig(parsed),
    description: "Configuration of automated lead follow-ups (send-follow-ups cron).",
    updated_by: updatedBy ?? null,
  });
  if (error) {
    throw new Error(`Failed to save followup config: ${error.message}`);
  }
  return parsed;
};
