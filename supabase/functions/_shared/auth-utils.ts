import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getBearerToken = (req: Request) => {
  const authorization = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Authentication is required");
  }

  return authorization.replace("Bearer ", "").trim();
};

export const createAnonClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase anonymous credentials");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

export const createServiceRoleClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase service credentials");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

export const tryGetAuthenticatedUser = async (req: Request) => {
  const authorization = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authorization.replace("Bearer ", "").trim();
    if (!token) {
      return null;
    }

    const supabase = createAnonClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.email) {
      return null;
    }

    return {
      id: data.user.id,
      email: normalizeEmail(data.user.email),
    };
  } catch {
    return null;
  }
};

export const requireAuthenticatedUser = async (req: Request) => {
  const token = getBearerToken(req);
  const supabase = createAnonClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user?.email) {
    throw new Error("Invalid authentication session");
  }

  return {
    id: data.user.id,
    email: normalizeEmail(data.user.email),
  };
};

export const requireAdminUser = async (supabase: SupabaseClient, req: Request) => {
  const user = await requireAuthenticatedUser(req);
  const { data, error } = await supabase
    .from("admins")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify admin access: ${error.message}`);
  }

  if (!data) {
    throw new Error("Admin access is required");
  }

  return user;
};

export const requireOwnedLead = async (
  supabase: SupabaseClient,
  leadId: string,
  userEmail: string,
) => {
  const { data, error } = await supabase
    .from("leads")
    .select("id, email")
    .eq("id", leadId)
    .single();

  if (error || !data) {
    throw new Error("Lead not found");
  }

  if (normalizeEmail(data.email) !== normalizeEmail(userEmail)) {
    throw new Error("You are not allowed to access this lead");
  }

  return data;
};
