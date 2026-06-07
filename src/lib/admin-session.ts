import { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export const ADMIN_DASHBOARD_PATH = "/admin";

export const isAdminEmail = async (email: string | null | undefined) => {
  if (!email) {
    return false;
  }

  const { data, error } = await supabase
    .from("admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
};

export const getAdminSession = async (): Promise<Session | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user.email) {
    return null;
  }

  return (await isAdminEmail(session.user.email)) ? session : null;
};
