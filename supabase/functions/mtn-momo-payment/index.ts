import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// MTN MoMo API Configuration
// Sandbox URL for provisioning API users
const MTN_SANDBOX_URL = "https://sandbox.momodeveloper.mtn.com";
// Production URL for actual payments
const MTN_MOMO_BASE_URL = "https://proxy.momoapi.mtn.com";

// Determine environment from env var (default to sandbox for safety)
const IS_PRODUCTION = Deno.env.get("MTN_MOMO_ENVIRONMENT") === "production";
const MTN_COLLECTION_URL = IS_PRODUCTION 
  ? `${MTN_MOMO_BASE_URL}/collection`
  : `${MTN_SANDBOX_URL}/collection`;

// Supported currencies for MTN MoMo
const SUPPORTED_CURRENCIES = ["XAF", "XOF", "EUR", "USD", "GHS", "UGX", "ZMW", "RWF"];

// Currency conversion rates to USD (approximate - in production, use a real-time API)
const CURRENCY_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  XAF: 0.0016,  // Central African CFA franc
  XOF: 0.0016,  // West African CFA franc
  GHS: 0.078,   // Ghanaian cedi
  UGX: 0.00027, // Ugandan shilling
  ZMW: 0.038,   // Zambian kwacha
  RWF: 0.00076, // Rwandan franc
};

// USD amount for consultation
const CONSULTATION_AMOUNT_USD = 25;

function generateUUID(): string {
  return crypto.randomUUID();
}

function encodeBasicAuth(userId: string, apiKey: string): string {
  return btoa(`${userId}:${apiKey}`);
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MTN-MOMO] ${step}${detailsStr}`);
};

interface MoMoConfig {
  primaryKey: string;
  secondaryKey: string;
  apiUserId: string;
  apiKey: string;
  environment: string;
  callbackHost: string;
}

// Step 1: Create API User (Sandbox provisioning)
async function createApiUser(config: MoMoConfig): Promise<{ success: boolean; userId?: string; error?: string }> {
  const referenceId = generateUUID();
  
  try {
    logStep("Creating API User", { referenceId });
    
    const response = await fetch(`${MTN_SANDBOX_URL}/v1_0/apiuser`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Reference-Id": referenceId,
        "Ocp-Apim-Subscription-Key": config.primaryKey,
      },
      body: JSON.stringify({
        providerCallbackHost: config.callbackHost,
      }),
    });

    if (response.status === 201 || response.status === 200) {
      logStep("API User created successfully", { referenceId });
      return { success: true, userId: referenceId };
    }
    
    const errorText = await response.text();
    logStep("API User creation failed", { status: response.status, error: errorText });
    return { success: false, error: `Failed to create API user: ${response.status} - ${errorText}` };
  } catch (error: any) {
    logStep("API User creation error", { error: error.message });
    return { success: false, error: error.message };
  }
}

// Step 2: Get API Key for the created user
async function getApiKey(config: MoMoConfig, userId: string): Promise<{ success: boolean; apiKey?: string; error?: string }> {
  try {
    logStep("Getting API Key for user", { userId });
    
    const response = await fetch(`${MTN_SANDBOX_URL}/v1_0/apiuser/${userId}/apikey`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": config.primaryKey,
      },
    });

    if (response.ok) {
      const data = await response.json();
      logStep("API Key retrieved successfully");
      return { success: true, apiKey: data.apiKey };
    }
    
    const errorText = await response.text();
    logStep("API Key retrieval failed", { status: response.status, error: errorText });
    return { success: false, error: `Failed to get API key: ${response.status} - ${errorText}` };
  } catch (error: any) {
    logStep("API Key retrieval error", { error: error.message });
    return { success: false, error: error.message };
  }
}

// Step 3: Get Access Token
async function getAccessToken(config: MoMoConfig): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    logStep("Getting access token");
    
    const basicAuth = encodeBasicAuth(config.apiUserId, config.apiKey);
    
    const response = await fetch(`${MTN_COLLECTION_URL}/token/`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Ocp-Apim-Subscription-Key": config.primaryKey,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      logStep("Access token retrieved successfully");
      return { success: true, accessToken: data.access_token };
    }
    
    const errorText = await response.text();
    logStep("Access token retrieval failed", { status: response.status, error: errorText });
    return { success: false, error: `Failed to get access token: ${response.status} - ${errorText}` };
  } catch (error: any) {
    logStep("Access token error", { error: error.message });
    return { success: false, error: error.message };
  }
}

// Step 4: Request to Pay
async function requestToPay(
  config: MoMoConfig,
  accessToken: string,
  amount: string,
  currency: string,
  phoneNumber: string,
  externalId: string,
  payerMessage: string,
  payeeNote: string
): Promise<{ success: boolean; referenceId?: string; error?: string }> {
  const referenceId = generateUUID();
  
  try {
    logStep("Initiating Request to Pay", { referenceId, amount, currency, phoneNumber });
    
    // Format phone number - remove leading zeros and country code variations
    let formattedPhone = phoneNumber.replace(/\s+/g, "").replace(/^\+/, "");
    if (formattedPhone.startsWith("237")) {
      formattedPhone = formattedPhone.substring(3);
    }
    if (formattedPhone.startsWith("0")) {
      formattedPhone = formattedPhone.substring(1);
    }
    // Add Cameroon country code
    formattedPhone = `237${formattedPhone}`;
    
    const response = await fetch(`${MTN_COLLECTION_URL}/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": config.environment,
        "Ocp-Apim-Subscription-Key": config.primaryKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount,
        currency: currency,
        externalId: externalId,
        payer: {
          partyIdType: "MSISDN",
          partyId: formattedPhone,
        },
        payerMessage: payerMessage,
        payeeNote: payeeNote,
      }),
    });

    if (response.status === 202 || response.status === 200) {
      logStep("Request to Pay initiated successfully", { referenceId });
      return { success: true, referenceId };
    }
    
    const errorText = await response.text();
    logStep("Request to Pay failed", { status: response.status, error: errorText });
    return { success: false, error: `Request to Pay failed: ${response.status} - ${errorText}` };
  } catch (error: any) {
    logStep("Request to Pay error", { error: error.message });
    return { success: false, error: error.message };
  }
}

// Step 5: Check Transaction Status
async function checkTransactionStatus(
  config: MoMoConfig,
  accessToken: string,
  referenceId: string
): Promise<{ success: boolean; status?: string; financialTransactionId?: string; error?: string }> {
  try {
    logStep("Checking transaction status", { referenceId });
    
    const response = await fetch(`${MTN_COLLECTION_URL}/v1_0/requesttopay/${referenceId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "X-Target-Environment": config.environment,
        "Ocp-Apim-Subscription-Key": config.primaryKey,
      },
    });

    if (response.ok) {
      const data = await response.json();
      logStep("Transaction status retrieved", { status: data.status });
      return { 
        success: true, 
        status: data.status,
        financialTransactionId: data.financialTransactionId 
      };
    }
    
    const errorText = await response.text();
    logStep("Transaction status check failed", { status: response.status, error: errorText });
    return { success: false, error: `Failed to check status: ${response.status} - ${errorText}` };
  } catch (error: any) {
    logStep("Transaction status error", { error: error.message });
    return { success: false, error: error.message };
  }
}

// Calculate amount in local currency
function calculateLocalAmount(usdAmount: number, currency: string): string {
  const rate = CURRENCY_TO_USD[currency];
  if (!rate) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  const localAmount = Math.ceil(usdAmount / rate);
  return localAmount.toString();
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, leadId, phoneNumber, currency = "XAF", referenceId } = await req.json();
    
    logStep("Request received", { action, leadId, currency });

    // Validate currency
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      return new Response(
        JSON.stringify({ 
          error: `Unsupported currency: ${currency}. Supported: ${SUPPORTED_CURRENCIES.join(", ")}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const primaryKey = Deno.env.get("MTN_MOMO_PRIMARY_KEY");
    const secondaryKey = Deno.env.get("MTN_MOMO_SECONDARY_KEY");
    
    if (!primaryKey || !secondaryKey) {
      logStep("Missing API keys");
      return new Response(
        JSON.stringify({ error: "MTN MoMo API keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get API credentials from environment
    const apiUserId = Deno.env.get("MTN_MOMO_API_USER_ID");
    const apiKey = Deno.env.get("MTN_MOMO_API_KEY");
    
    // Determine target environment
    // Production environments: mtnuganda, mtnghana, mtnivorycoast, mtnzambia, mtncameroon, mtnbenin, mtncongo, mtnswaziland, mtnguineaconakry, mtnsouthafrica
    const targetEnvironment = Deno.env.get("MTN_MOMO_TARGET_ENVIRONMENT") || "sandbox";
    
    const config: MoMoConfig = {
      primaryKey,
      secondaryKey,
      apiUserId: apiUserId || "",
      apiKey: apiKey || "",
      environment: targetEnvironment,
      callbackHost: Deno.env.get("SUPABASE_URL") || "https://webhook.site",
    };

    // Handle different actions
    switch (action) {
      case "provision": {
        // Create API user and get API key (sandbox only)
        const userResult = await createApiUser(config);
        if (!userResult.success) {
          return new Response(
            JSON.stringify({ error: userResult.error }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const keyResult = await getApiKey(config, userResult.userId!);
        if (!keyResult.success) {
          return new Response(
            JSON.stringify({ error: keyResult.error }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            success: true,
            apiUserId: userResult.userId,
            apiKey: keyResult.apiKey,
            message: "API credentials provisioned. Store these securely!"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "request_payment": {
        // Validate inputs
        if (!leadId || !phoneNumber) {
          return new Response(
            JSON.stringify({ error: "Missing required fields: leadId, phoneNumber" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if API credentials are configured
        if (!config.apiUserId || !config.apiKey) {
          // For now, if credentials aren't set, update lead for manual verification
          logStep("API credentials not fully configured, using manual flow");
          
          const localAmount = calculateLocalAmount(CONSULTATION_AMOUNT_USD, currency);
          const transactionId = `MTN-${Date.now()}-${generateUUID().substring(0, 8)}`;
          
          const { error: updateError } = await supabase
            .from("leads")
            .update({
              payment_status: "mobile_money_pending",
              payment_id: transactionId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", leadId);

          if (updateError) {
            logStep("Error updating lead", { error: updateError });
            return new Response(
              JSON.stringify({ error: "Failed to process payment request" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({ 
              success: true,
              transactionId,
              amount: localAmount,
              currency,
              usdEquivalent: CONSULTATION_AMOUNT_USD,
              targetAccount: "651831709",
              message: `Please send ${localAmount} ${currency} (≈$${CONSULTATION_AMOUNT_USD} USD) to MTN number 651831709. Your payment will be verified shortly.`,
              status: "pending_verification"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get access token
        const tokenResult = await getAccessToken(config);
        if (!tokenResult.success) {
          return new Response(
            JSON.stringify({ error: tokenResult.error }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Calculate amount in local currency
        const localAmount = calculateLocalAmount(CONSULTATION_AMOUNT_USD, currency);
        const externalId = `LEAD-${leadId}-${Date.now()}`;

        // Request to Pay
        const payResult = await requestToPay(
          config,
          tokenResult.accessToken!,
          localAmount,
          currency,
          phoneNumber,
          externalId,
          "Power Prestation - Consultation Payment",
          "Thank you for your payment"
        );

        if (!payResult.success) {
          return new Response(
            JSON.stringify({ error: payResult.error }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update lead with pending payment
        await supabase
          .from("leads")
          .update({
            payment_status: "mobile_money_pending",
            payment_id: payResult.referenceId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", leadId);

        return new Response(
          JSON.stringify({ 
            success: true,
            referenceId: payResult.referenceId,
            amount: localAmount,
            currency,
            usdEquivalent: CONSULTATION_AMOUNT_USD,
            message: `Payment request sent to ${phoneNumber}. Please approve on your phone.`,
            status: "pending"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "check_status": {
        if (!referenceId) {
          return new Response(
            JSON.stringify({ error: "Missing referenceId" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!config.apiUserId || !config.apiKey) {
          return new Response(
            JSON.stringify({ 
              status: "pending_verification",
              message: "Manual verification in progress"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const tokenResult = await getAccessToken(config);
        if (!tokenResult.success) {
          return new Response(
            JSON.stringify({ error: tokenResult.error }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const statusResult = await checkTransactionStatus(config, tokenResult.accessToken!, referenceId);
        
        if (!statusResult.success) {
          return new Response(
            JSON.stringify({ error: statusResult.error }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update lead if payment successful
        if (statusResult.status === "SUCCESSFUL" && leadId) {
          await supabase
            .from("leads")
            .update({
              payment_status: "paid",
              updated_at: new Date().toISOString(),
            })
            .eq("id", leadId);
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            status: statusResult.status,
            financialTransactionId: statusResult.financialTransactionId
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_currencies": {
        const currencyInfo = SUPPORTED_CURRENCIES.map(curr => ({
          code: curr,
          rate: CURRENCY_TO_USD[curr],
          amount: calculateLocalAmount(CONSULTATION_AMOUNT_USD, curr),
        }));
        
        return new Response(
          JSON.stringify({ 
            currencies: currencyInfo,
            usdAmount: CONSULTATION_AMOUNT_USD
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: any) {
    logStep("Unhandled error", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
