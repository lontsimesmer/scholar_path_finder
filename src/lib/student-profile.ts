import { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export interface StudentProfileRecord {
  id: string;
  email: string | null;
  phone_number: string | null;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  profile_locked_at: string | null;
  profile_validation_comment: string | null;
  profile_invalidated_at: string | null;
  current_degree: string | null;
  target_country: string | null;
  target_program: string | null;
}

export type StudentProfileReviewStatus = "pending" | "validated" | "correction_requested";

const trimValue = (value: string | null | undefined) => value?.trim() ?? "";
const inFlightProfileRequests = new Map<string, Promise<StudentProfileRecord>>();

const isDuplicateProfileInsertError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23505";

export const buildStudentFullName = (
  firstName: string | null | undefined,
  lastName: string | null | undefined,
) => {
  const parts = [trimValue(firstName), trimValue(lastName)].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
};

export const splitStudentFullName = (fullName: string | null | undefined) => {
  const normalizedFullName = trimValue(fullName);
  if (!normalizedFullName) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  const parts = normalizedFullName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "",
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
};

export const getStudentDisplayName = (
  profile: Pick<StudentProfileRecord, "first_name" | "last_name"> | null | undefined,
  fallbackEmail?: string | null,
) =>
  buildStudentFullName(profile?.first_name, profile?.last_name) ||
  trimValue(fallbackEmail?.split("@")[0]) ||
  "Student";

export const hasRequiredProcedureProfile = (
  profile: Pick<StudentProfileRecord, "first_name" | "last_name" | "birth_date"> | null | undefined,
) =>
  trimValue(profile?.first_name).length > 0 &&
  trimValue(profile?.last_name).length > 0 &&
  trimValue(profile?.birth_date).length > 0;

export const isStudentProfileLocked = (
  profile: Pick<StudentProfileRecord, "profile_locked_at"> | null | undefined,
) => trimValue(profile?.profile_locked_at).length > 0;

export const getStudentProfileCorrectionComment = (
  profile: Pick<StudentProfileRecord, "profile_validation_comment"> | null | undefined,
) => {
  const comment = trimValue(profile?.profile_validation_comment);
  return comment.length > 0 ? comment : null;
};

export const hasStudentProfileCorrectionRequest = (
  profile:
    | Pick<StudentProfileRecord, "profile_validation_comment" | "profile_invalidated_at">
    | null
    | undefined,
) =>
  Boolean(getStudentProfileCorrectionComment(profile)) ||
  trimValue(profile?.profile_invalidated_at).length > 0;

export const getStudentProfileReviewStatus = (
  profile:
    | Pick<
        StudentProfileRecord,
        "profile_locked_at" | "profile_validation_comment" | "profile_invalidated_at"
      >
    | null
    | undefined,
): StudentProfileReviewStatus => {
  if (isStudentProfileLocked(profile)) {
    return "validated";
  }

  if (hasStudentProfileCorrectionRequest(profile)) {
    return "correction_requested";
  }

  return "pending";
};

export const hasValidatedProcedureProfile = (
  profile:
    | Pick<StudentProfileRecord, "first_name" | "last_name" | "birth_date" | "profile_locked_at">
    | null
    | undefined,
) => hasRequiredProcedureProfile(profile) && isStudentProfileLocked(profile);

const loadStudentProfile = async (
  user: Pick<User, "id" | "email">,
) => {
  const { data: existingProfile, error: selectError } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existingProfile) {
    return existingProfile as StudentProfileRecord;
  }

  const { data, error } = await supabase
    .from("student_profiles")
    .insert({
      id: user.id,
      email: user.email ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (isDuplicateProfileInsertError(error)) {
      const { data: concurrentProfile, error: concurrentSelectError } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (concurrentSelectError) {
        throw concurrentSelectError;
      }

      return concurrentProfile as StudentProfileRecord;
    }

    throw error;
  }

  return data as StudentProfileRecord;
};

export const ensureStudentProfile = async (
  user: Pick<User, "id" | "email">,
) => {
  const existingRequest = inFlightProfileRequests.get(user.id);
  if (existingRequest) {
    return existingRequest;
  }

  const request = loadStudentProfile(user).finally(() => {
    inFlightProfileRequests.delete(user.id);
  });

  inFlightProfileRequests.set(user.id, request);
  return request;
};
