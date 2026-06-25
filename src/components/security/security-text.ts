import { useLanguage } from "@/i18n/language";

export const MIN_PASSWORD_LENGTH = 8;

export interface SecurityText {
  triggerLabel: string;
  dialogTitle: string;
  dialogDescription: string;
  currentPasswordLabel: string;
  currentPasswordPlaceholder: string;
  newPasswordLabel: string;
  newPasswordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  showPasswordLabel: string;
  hidePasswordLabel: string;
  submitLabel: string;
  submittingLabel: string;
  cancelLabel: string;
  successTitle: string;
  successDescription: string;
  errorTitle: string;
  errorTooShort: string;
  errorMismatch: string;
  errorWrongCurrent: string;
  errorSameAsCurrent: string;
  errorNoSession: string;
  errorGeneric: string;
}

export const useSecurityText = (): SecurityText => {
  const { t } = useLanguage();
  return t.security as SecurityText;
};
