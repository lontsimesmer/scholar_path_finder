import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import {
  createServiceRoleClient,
  normalizeEmail,
  requireAuthenticatedUser,
} from "../_shared/auth-utils.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIONABLE_PAYMENT_STATUSES = [
  "unpaid",
  "refunded",
  "pending",
  "mobile_money_pending",
  "bank_transfer_pending",
] as const;

const logger = createLogger("GET-STUDENT-PROCEDURE-STATUS");

type LeadRecord = {
  id: string;
  email: string;
  status: string;
  payment_status: string | null;
  created_at: string;
  updated_at: string;
};

const isActionablePaymentStatus = (paymentStatus: string | null) =>
  ACTIONABLE_PAYMENT_STATUSES.includes(
    (paymentStatus ?? "unpaid") as (typeof ACTIONABLE_PAYMENT_STATUSES)[number],
  );

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("leads")
      .select("id, email, status, payment_status, created_at, updated_at")
      .eq("email", normalizeEmail(user.email))
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to load the student lead summary: ${error.message}`);
    }

    const leads = (data as LeadRecord[] | null) ?? [];
    const lead =
      leads.find((item) => isActionablePaymentStatus(item.payment_status)) ??
      leads[0] ??
      null;

    logger.info("Resolved student procedure status", {
      userId: user.id,
      hasLead: Boolean(lead),
      paymentStatus: lead?.payment_status ?? null,
    });

    return new Response(
      JSON.stringify({
        lead: lead
          ? {
              leadId: lead.id,
              email: lead.email,
              leadStatus: lead.status,
              paymentStatus: lead.payment_status ?? "unpaid",
              createdAt: lead.created_at,
              updatedAt: lead.updated_at,
            }
          : null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error("Failed to load student procedure status", { message });

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
