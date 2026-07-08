import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import {
  createServiceRoleClient,
  requireAdminUser,
} from "../_shared/auth-utils.ts";
import {
  type FollowupConfig,
  DEFAULT_FOLLOWUP_CONFIG,
  loadFollowupConfig,
  parseFollowupConfig,
  saveFollowupConfig,
  serializeFollowupConfig,
} from "../_shared/followup-settings.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const logger = createLogger("ADMIN-FOLLOWUP-SETTINGS");

const getErrorStatus = (message: string) => {
  if (message === "Authentication is required" || message === "Invalid authentication session") {
    return 401;
  }
  if (message === "Admin access is required") return 403;
  if (message === "Invalid configuration payload") return 400;
  return 500;
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const parseIncomingConfig = (body: unknown): FollowupConfig => {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid configuration payload");
  }
  const source = body as Record<string, unknown>;
  const raw = {
    enabled: source.enabled,
    max_follow_ups: source.maxFollowUps ?? source.max_follow_ups,
    interval_hours: source.intervalHours ?? source.interval_hours,
  };
  return parseFollowupConfig(raw);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceRoleClient();
    const caller = await requireAdminUser(supabase, req);

    if (req.method === "GET") {
      const config = await loadFollowupConfig(supabase);
      return jsonResponse({ config: serializeFollowupConfig(config), defaults: serializeFollowupConfig(DEFAULT_FOLLOWUP_CONFIG) });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      const nextConfig = parseIncomingConfig(body);
      const saved = await saveFollowupConfig(supabase, nextConfig, caller.email);
      logger.info("Followup config updated", { by: caller.email, config: saved });
      return jsonResponse({ ok: true, config: serializeFollowupConfig(saved) });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error("admin-followup-settings request failed", { message });
    return jsonResponse({ error: message }, getErrorStatus(message));
  }
});
