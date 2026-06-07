import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import { buildPublicSiteUrl } from "../_shared/cinetpay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeText = (value: string | null | undefined) => value?.trim() ?? "";

const buildRedirectUrl = (req: Request, formValues: URLSearchParams | null) => {
  const requestUrl = new URL(req.url);
  const leadId = normalizeText(requestUrl.searchParams.get("leadId"));
  const transactionId = normalizeText(
    requestUrl.searchParams.get("transaction_id") ??
      requestUrl.searchParams.get("cpm_trans_id") ??
      formValues?.get("transaction_id") ??
      formValues?.get("cpm_trans_id"),
  );

  const redirectUrl = new URL(`${buildPublicSiteUrl(req)}/payment-success`);
  redirectUrl.searchParams.set("provider", "cinetpay");

  if (leadId) {
    redirectUrl.searchParams.set("leadId", leadId);
  }

  if (transactionId) {
    redirectUrl.searchParams.set("transaction_id", transactionId);
  }

  return {
    redirectUrl: redirectUrl.toString(),
    hasPaymentContext: Boolean(leadId || transactionId),
  };
};

const parsePostedValues = async (req: Request) => {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await req.text();
    return new URLSearchParams(body);
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    return new URLSearchParams(
      Array.from(formData.entries()).map(([key, value]) => [key, String(value)]),
    );
  }

  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("method_not_allowed", { headers: corsHeaders, status: 405 });
  }

  const formValues = req.method === "POST" ? await parsePostedValues(req) : null;
  const { redirectUrl, hasPaymentContext } = buildRedirectUrl(req, formValues);

  if (!hasPaymentContext) {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting...</title>
    <script>
      window.location.replace(${JSON.stringify(redirectUrl)});
    </script>
  </head>
  <body>
    <p>Redirecting to the payment confirmation page...</p>
    <p><a href="${escapeHtml(redirectUrl)}">Continue</a></p>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
    status: 200,
  });
});
