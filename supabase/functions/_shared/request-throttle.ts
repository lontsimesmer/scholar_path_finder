import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type EnforceRequestRateLimitInput = {
  scope: string;
  bucketKey: string;
  maxRequests: number;
  windowSeconds: number;
  metadata?: Record<string, unknown>;
};

export const getClientAddress = (req: Request) => {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const cfConnectingIp = req.headers.get("cf-connecting-ip")?.trim();

  return forwardedFor || realIp || cfConnectingIp || "unknown";
};

export const enforceRequestRateLimit = async (
  supabase: SupabaseClient,
  input: EnforceRequestRateLimitInput,
) => {
  const windowStartedAt = new Date(Date.now() - input.windowSeconds * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from("edge_request_events")
    .select("*", { count: "exact", head: true })
    .eq("scope", input.scope)
    .eq("bucket_key", input.bucketKey)
    .gte("created_at", windowStartedAt);

  if (countError) {
    throw new Error(`Failed to check the request rate limit: ${countError.message}`);
  }

  if ((count ?? 0) >= input.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  const { error: insertError } = await supabase.from("edge_request_events").insert({
    scope: input.scope,
    bucket_key: input.bucketKey,
    metadata: input.metadata ?? {},
  });

  if (insertError) {
    throw new Error(`Failed to record the request rate-limit event: ${insertError.message}`);
  }

  return {
    allowed: true,
    remaining: Math.max(input.maxRequests - ((count ?? 0) + 1), 0),
  };
};
