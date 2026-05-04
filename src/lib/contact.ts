import type { LucideIcon } from "lucide-react";

import type { ProcedureDraft } from "@/lib/procedure-draft";

export type SubmitLeadResponse = {
  success?: boolean;
  leadId?: string;
  accountStatus?: "authenticated" | "created" | "existing_requires_sign_in" | "none";
  leadReused?: boolean;
  alreadyActive?: boolean;
  verificationRequired?: boolean;
  verificationChannels?: Array<"email" | "sms">;
  verificationEmail?: string | null;
  verificationAccessToken?: string | null;
};

export type ContactFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
};

export type ContactProfileIdentity = {
  firstName: string;
  lastName: string;
};

export type ContactInfoItem = {
  icon: LucideIcon;
  label: string;
  value: string;
  href: string;
};

export type ContactFormText = {
  title: string;
  email: string;
  emailPlaceholder: string;
  phone: string;
  message: string;
  messagePlaceholder: string;
  privacyNote: string;
  successTitle: string;
  successMessage: string;
  errorTitle: string;
  errorMessage: string;
  password: string;
  passwordPlaceholder: string;
  confirmPassword: string;
  confirmPasswordPlaceholder: string;
  createAccountHint: string;
  signedInHint: string;
  existingAccountTitle: string;
  existingAccountDescription: string;
  accountCreatedTitle: string;
  accountCreatedDescription: string;
  completeProfileTitle: string;
  completeProfileDescription: string;
  completeProfileAction: string;
  submitProcedure: string;
  createAccountAndSubmit: string;
  passwordMismatchTitle: string;
  passwordMismatchDescription: string;
  passwordRequiredTitle: string;
  passwordRequiredDescription: string;
  phoneAlreadyUsedTitle: string;
  phoneAlreadyUsedDescription: string;
  verificationPendingTitle: string;
  verificationPendingDescription: string;
  firstName: string;
  firstNamePlaceholder: string;
  lastName: string;
  lastNamePlaceholder: string;
};

export const initialContactFormData: ContactFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  message: "",
};

type MergeContactDraftParams = {
  current: ContactFormData;
  draft: ProcedureDraft;
  userEmail?: string | null;
  profileIdentity?: ContactProfileIdentity | null;
};

export const mergeContactDraft = ({
  current,
  draft,
  userEmail,
  profileIdentity,
}: MergeContactDraftParams): ContactFormData => {
  return {
    ...current,
    firstName: profileIdentity?.firstName || current.firstName || draft.firstName,
    lastName: profileIdentity?.lastName || current.lastName || draft.lastName,
    email: userEmail || current.email || draft.email,
    phone: draft.phone || current.phone,
    message: draft.message || current.message,
  };
};
