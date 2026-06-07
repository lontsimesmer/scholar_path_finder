import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type StudentApplicationRecord = {
  id: string;
  student_id: string;
  status: string;
};

const loadLatestApplication = async (supabase: SupabaseClient, studentId: string) => {
  const { data, error } = await supabase
    .from("student_applications")
    .select("id, student_id, status")
    .eq("student_id", studentId)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to load student application: ${error.message}`);
  }

  return (data?.[0] as StudentApplicationRecord | undefined) ?? null;
};

export const ensureConsultationApplication = async (
  supabase: SupabaseClient,
  studentId: string,
) => {
  const existingApplication = await loadLatestApplication(supabase, studentId);
  if (existingApplication) {
    return {
      application: existingApplication,
      created: false,
    };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("student_applications")
    .insert({
      student_id: studentId,
      status: "consultation_paid",
      updated_at: now,
    })
    .select("id, student_id, status")
    .single();

  if (!error) {
    return {
      application: data as StudentApplicationRecord,
      created: true,
    };
  }

  const existingAfterInsert = await loadLatestApplication(supabase, studentId);
  if (existingAfterInsert) {
    return {
      application: existingAfterInsert,
      created: false,
    };
  }

  throw new Error(`Failed to create student application: ${error.message}`);
};
