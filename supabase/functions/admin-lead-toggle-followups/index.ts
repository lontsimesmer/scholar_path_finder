import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import {
  createServiceRoleClient,
  requireAdminUser,
} from "../_shared/auth-utils.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logger = createLogger("ADMIN-LEAD-TOGGLE-FOLLOWUPS");

type ToggleRequest = {
  leadId?: string;
  paused?: boolean;
  reason?: string;
};

const getErrorStatus = (message: string) => {
  if (message === "Authentication is required" || message === "Invalid authentication session") {
    return 401;
  }
  if (message === "Admin access is required") {
    return 403;
  }
  if (message === "leadId is required" || message === "paused flag is required") {
    return 400;
  }
  if (message === "Lead not found") {
    return 404;
  }
  return 500;
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json().catch(() => ({}))) as ToggleRequest;
    const leadId = body.leadId?.trim();
    if (!leadId) {
      throw new Error("leadId is required");
    }
    if (typeof body.paused !== "boolean") {
      throw new Error("paused flag is required");
    }

    const supabase = createServiceRoleClient();
    const admin = await requireAdminUser(supabase, req);

    const { data: lead, error: loadError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .maybeSingle();
    if (loadError || !lead) {
      throw new Error("Lead not found");
    }

    const now = new Date().toISOString();
    const reason = body.reason?.trim() || null;

    const update = body.paused
      ? {
        follow_up_paused_at: now,
        follow_up_paused_by: admin.email,
        follow_up_paused_reason: reason,
        updated_at: now,
      }
      : {
        follow_up_paused_at: null,
        follow_up_paused_by: null,
        follow_up_paused_reason: null,
        updated_at: now,
      };

    const { data: updated, error: updateError } = await supabase
      .from("leads")
      .update(update)
      .eq("id", leadId)
      .select("id, follow_up_paused_at, follow_up_paused_by, follow_up_paused_reason")
      .single();

    if (updateError) {
      throw new Error(`Failed to toggle follow-up pause: ${updateError.message}`);
    }

    logger.info("Lead follow-up pause toggled", {
      leadId,
      admin: admin.email,
      paused: body.paused,
    });

    return jsonResponse({ ok: true, lead: updated });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.warn("admin-lead-toggle-followups request failed", { message });
    return jsonResponse({ error: message }, getErrorStatus(message));
  }
});
