import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import {
  createServiceRoleClient,
  requireAuthenticatedUser,
  requireOwnedLead,
} from "../_shared/auth-utils.ts";
import {
  buildFunctionsUrl,
  createMerchantTransactionId,
  getCinetPayCheckoutSettings,
  initializeCinetPayPayment,
  requireCinetPayTestAccess,
  type CinetPayChannel,
} from "../_shared/cinetpay.ts";
import { getCheckoutPricing } from "../_shared/checkout-settings.ts";
import {
  createPaymentTransaction,
  markTransactionInitializationFailed,
  updateTransactionAfterInitialization,
} from "../_shared/cinetpay-transactions.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CAMEROON_COUNTRY_CODE = "CM";
const CAMEROON_STATE_CODE = "CM";

const logger = createLogger("CREATE-CINETPAY-PAYMENT");

type BillingDetails = {
  phoneNumber: string;
  address: string;
  city: string;
  zipCode: string;
};

type CreatePaymentRequest = {
  leadId?: string;
  channel?: CinetPayChannel;
  lang?: "fr" | "en";
  billingDetails?: Partial<BillingDetails>;
};

const normalizeText = (value: string | null | undefined) => value?.trim() ?? "";

const getErrorStatus = (message: string) => {
  if (
    message === "This payment is currently restricted to test accounts"
  ) {
    return 403;
  }

  if (
    message.startsWith("Missing required card billing fields:") ||
    message.startsWith("Billing phone number must contain") ||
    message.startsWith("Billing postal code must contain") ||
    message === "leadId is required" ||
    message === "A valid CinetPay channel is required"
  ) {
    return 400;
  }

  if (message === "Complete and validate your profile before starting the payment") {
    return 409;
  }

  return 500;
};

const normalizePhoneNumber = (value: string) => {
  const trimmed = value.trim();
  const hasLeadingPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");

  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    throw new Error("Billing phone number must contain between 8 and 15 digits");
  }

  return hasLeadingPlus ? `+${digitsOnly}` : `+${digitsOnly}`;
};

const requirePostalCode = (value: string) => {
  const normalized = value.trim();
  if (!/^\d{5}$/.test(normalized)) {
    throw new Error("Billing postal code must contain exactly 5 digits");
  }

  return normalized;
};

const requireCardBillingDetails = (billingDetails: Partial<BillingDetails> | undefined) => {
  const normalized = {
    phoneNumber: normalizePhoneNumber(normalizeText(billingDetails?.phoneNumber)),
    address: normalizeText(billingDetails?.address),
    city: normalizeText(billingDetails?.city),
    zipCode: requirePostalCode(normalizeText(billingDetails?.zipCode)),
  };

  const missingFields = Object.entries(normalized)
    .filter(([, value]) => value.length === 0)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    throw new Error(`Missing required card billing fields: ${missingFields.join(", ")}`);
  }

  return normalized;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as CreatePaymentRequest;
    const leadId = normalizeText(body.leadId);
    const channel = body.channel;
    const lang = body.lang === "en" ? "en" : "fr";

    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!channel || !["MOBILE_MONEY", "CREDIT_CARD"].includes(channel)) {
      return new Response(JSON.stringify({ error: "A valid CinetPay channel is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const user = await requireAuthenticatedUser(req);
    const checkoutSettings = getCinetPayCheckoutSettings();
    requireCinetPayTestAccess(user.email, checkoutSettings);
    const supabase = createServiceRoleClient();
    const checkoutPricing = await getCheckoutPricing(supabase, checkoutSettings);
    const checkoutAmountXaf = checkoutSettings.isTestMode
      ? checkoutSettings.testAmountXaf ?? checkoutPricing.amountXaf
      : checkoutPricing.amountXaf;
    const lead = await requireOwnedLead(supabase, leadId, user.email);
    const { data: leadRecord, error: leadError } = await supabase
      .from("leads")
      .select("id, email, payment_status")
      .eq("id", lead.id)
      .single();

    if (leadError || !leadRecord) {
      throw new Error("Lead not found");
    }

    if (leadRecord.payment_status === "paid") {
      return new Response(JSON.stringify({ error: "This consultation has already been paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("student_profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Failed to load the student profile: ${profileError.message}`);
    }

    const firstName = normalizeText(profile?.first_name);
    const lastName = normalizeText(profile?.last_name);
    if (!firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: "Complete and validate your profile before starting the payment" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        },
      );
    }

    const billingDetails =
      channel === "CREDIT_CARD" ? requireCardBillingDetails(body.billingDetails) : null;
    const transactionId = createMerchantTransactionId();
    const notifyUrl = buildFunctionsUrl("cinetpay-webhook");
    const returnUrl =
      `${buildFunctionsUrl("cinetpay-return")}?leadId=${encodeURIComponent(lead.id)}`;

    logger.info("Initializing CinetPay payment", {
      channel,
      leadId: lead.id,
      studentId: user.id,
      isTestMode: checkoutSettings.isTestMode,
      amountXaf: checkoutAmountXaf,
    });

    await createPaymentTransaction(supabase, {
      leadId: lead.id,
      studentId: user.id,
      transactionId,
      channel,
      amount: checkoutAmountXaf,
      currency: "XAF",
      customerEmail: user.email,
      customerPhoneNumber: billingDetails?.phoneNumber ?? null,
      customerName: lastName,
      customerSurname: firstName,
      customerAddress: billingDetails?.address ?? null,
      customerCity: billingDetails?.city ?? null,
      customerCountry: CAMEROON_COUNTRY_CODE,
      customerState: CAMEROON_STATE_CODE,
      customerZipCode: billingDetails?.zipCode ?? null,
      metadata: {
        leadId: lead.id,
        studentId: user.id,
        channel,
      },
    });

    try {
      const initializationResponse = await initializeCinetPayPayment({
        transactionId,
        amount: checkoutAmountXaf,
        currency: "XAF",
        description: checkoutSettings.isTestMode
          ? "Power Prestation consultation payment TEST MODE"
          : "Power Prestation consultation payment",
        notifyUrl,
        returnUrl,
        channels: channel,
        lang,
        metadata: JSON.stringify({
          leadId: lead.id,
          studentId: user.id,
          channel,
        }),
        customerId: user.id,
        customerName: lastName,
        customerSurname: firstName,
        customerEmail: user.email,
        customerPhoneNumber: billingDetails?.phoneNumber,
        customerAddress: billingDetails?.address,
        customerCity: billingDetails?.city,
        customerCountry: CAMEROON_COUNTRY_CODE,
        customerState: CAMEROON_STATE_CODE,
        customerZipCode: billingDetails?.zipCode,
      });

      await updateTransactionAfterInitialization(supabase, transactionId, initializationResponse);

      const { error: leadUpdateError } = await supabase
        .from("leads")
        .update({
          payment_status: "pending",
          payment_id: transactionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      if (leadUpdateError) {
        throw new Error(`Failed to update lead payment state: ${leadUpdateError.message}`);
      }

      logger.info("CinetPay payment created", {
        transactionId,
        leadId: lead.id,
        channel,
      });

      return new Response(
        JSON.stringify({
          paymentUrl: initializationResponse.data?.payment_url,
          paymentToken: initializationResponse.data?.payment_token,
          transactionId,
          amount: checkoutAmountXaf,
          currency: "XAF",
          usdReference: checkoutPricing.usdReference,
          isTestMode: checkoutSettings.isTestMode,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    } catch (error) {
      await markTransactionInitializationFailed(supabase, transactionId, getErrorMessage(error));
      throw error;
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error("Failed to initialize CinetPay payment", { message });

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: getErrorStatus(message),
    });
  }
});
