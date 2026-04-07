export type CinetPayChannel = "ALL" | "MOBILE_MONEY" | "CREDIT_CARD" | "WALLET";

export type CinetPayInitializationInput = {
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
  notifyUrl: string;
  returnUrl: string;
  channels: CinetPayChannel;
  lang: "fr" | "en";
  metadata?: string;
  customerId?: string;
  customerName?: string;
  customerSurname?: string;
  customerEmail?: string;
  customerPhoneNumber?: string;
  customerAddress?: string;
  customerCity?: string;
  customerCountry?: string;
  customerState?: string;
  customerZipCode?: string;
  lockPhoneNumber?: boolean;
};

export type CinetPayInitializationResponse = {
  code?: string | number;
  message?: string;
  description?: string;
  api_response_id?: string;
  data?: {
    payment_token?: string;
    payment_url?: string;
  };
};

export type CinetPayVerificationResponse = {
  code?: string | number;
  message?: string;
  api_response_id?: string;
  data?: {
    amount?: string;
    currency?: string;
    status?: string;
    payment_method?: string;
    description?: string;
    metadata?: string | null;
    operator_id?: string | null;
    payment_date?: string | null;
    fund_availability_date?: string | null;
  };
};

const CINETPAY_INITIALIZATION_URL = "https://api-checkout.cinetpay.com/v2/payment";
const CINETPAY_VERIFICATION_URL = "https://api-checkout.cinetpay.com/v2/payment/check";

const normalizeValue = (value: string | null | undefined) => value?.trim() ?? "";

const sanitizeDescription = (value: string) =>
  value
    .replace(/[#$/_&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const safeCompare = (left: string, right: string) => {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
};

const signHmacSha256 = async (payload: string, secretKey: string) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(signature);
};

export const buildPublicSiteUrl = (req: Request) => {
  const configuredUrl = Deno.env.get("SITE_URL");
  const origin = req.headers.get("origin");
  const siteUrl = configuredUrl || origin || "http://localhost:8080";
  return siteUrl.replace(/\/$/, "");
};

export const buildFunctionsUrl = (functionName: string) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is not configured");
  }

  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/${functionName}`;
};

export const getCinetPayConfig = () => {
  const apiKey = Deno.env.get("CINETPAY_API_KEY") ?? "";
  const siteId = Deno.env.get("CINETPAY_SITE_ID") ?? "";
  const secretKey = Deno.env.get("CINETPAY_SECRET_KEY") ?? "";

  if (!apiKey || !siteId || !secretKey) {
    throw new Error("CINETPAY_API_KEY, CINETPAY_SITE_ID, and CINETPAY_SECRET_KEY are required");
  }

  return { apiKey, siteId, secretKey };
};

export const createMerchantTransactionId = () =>
  `PP-${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

export const initializeCinetPayPayment = async (
  input: CinetPayInitializationInput,
) => {
  const config = getCinetPayConfig();
  const payload = {
    apikey: config.apiKey,
    site_id: config.siteId,
    transaction_id: input.transactionId,
    amount: input.amount,
    currency: input.currency,
    description: sanitizeDescription(input.description),
    notify_url: input.notifyUrl,
    return_url: input.returnUrl,
    channels: input.channels,
    lang: input.lang,
    metadata: input.metadata,
    customer_id: input.customerId,
    customer_name: input.customerName,
    customer_surname: input.customerSurname,
    customer_email: input.customerEmail,
    customer_phone_number: input.customerPhoneNumber,
    customer_address: input.customerAddress,
    customer_city: input.customerCity,
    customer_country: input.customerCountry,
    customer_state: input.customerState,
    customer_zip_code: input.customerZipCode,
    lock_phone_number: input.lockPhoneNumber,
  };

  const response = await fetch(CINETPAY_INITIALIZATION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as CinetPayInitializationResponse | null;

  if (!response.ok || !data) {
    throw new Error("Failed to initialize the CinetPay transaction");
  }

  const code = String(data.code ?? "");
  if (code !== "201" || !data.data?.payment_url || !data.data.payment_token) {
    throw new Error(data.description || data.message || "CinetPay did not return a payment URL");
  }

  return data;
};

export const checkCinetPayPayment = async (transactionId: string) => {
  const config = getCinetPayConfig();
  const response = await fetch(CINETPAY_VERIFICATION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apikey: config.apiKey,
      site_id: config.siteId,
      transaction_id: transactionId,
    }),
  });

  const data = (await response.json().catch(() => null)) as CinetPayVerificationResponse | null;
  if (!response.ok || !data) {
    throw new Error("Failed to verify the CinetPay transaction");
  }

  return data;
};

export const verifyCinetPayNotificationToken = async (
  formValues: Record<string, string>,
  receivedToken: string | null,
) => {
  if (!receivedToken) {
    return false;
  }

  const { secretKey } = getCinetPayConfig();
  const payload = [
    formValues.cpm_site_id,
    formValues.cpm_trans_id,
    formValues.cpm_trans_date,
    formValues.cpm_amount,
    formValues.cpm_currency,
    formValues.signature,
    formValues.payment_method,
    formValues.cel_phone_num,
    formValues.cpm_phone_prefixe,
    formValues.cpm_language,
    formValues.cpm_version,
    formValues.cpm_payment_config,
    formValues.cpm_page_action,
    formValues.cpm_custom,
    formValues.cpm_designation,
    formValues.cpm_error_message,
  ]
    .map((item) => normalizeValue(item))
    .join("");

  const generatedToken = await signHmacSha256(payload, secretKey);
  return safeCompare(receivedToken.trim().toLowerCase(), generatedToken.toLowerCase());
};

export const toFormValueRecord = (formData: FormData) =>
  Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [key, String(value)]),
  ) as Record<string, string>;

export const parseProviderDate = (value: string | null | undefined) => {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return null;
  }

  const isoCandidate = normalized.replace(" ", "T");
  const date = new Date(isoCandidate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};
