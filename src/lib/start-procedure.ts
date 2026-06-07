export interface SubmitLeadResponse {
  success?: boolean;
  leadId?: string;
  leadReused?: boolean;
  alreadyActive?: boolean;
}

export interface StartProcedureText {
  activeDescription: string;
  activeTitle: string;
  backToDashboard: string;
  badge: string;
  birthDate: string;
  formDescription: string;
  formTitle: string;
  fullName: string;
  loading: string;
  loadErrorDescription: string;
  loadErrorTitle: string;
  message: string;
  messagePlaceholder: string;
  nextStepsPayment: string;
  nextStepsProfile: string;
  nextStepsSubmit: string;
  nextStepsTitle: string;
  pendingDescription: string;
  pendingTitle: string;
  phone: string;
  phoneAlreadyUsedDescription: string;
  phoneAlreadyUsedTitle: string;
  phonePlaceholder: string;
  profileRequiredAction: string;
  profileRequiredDescription: string;
  profileRequiredTitle: string;
  profileSummaryTitle: string;
  resumePaymentAction: string;
  resumePaymentDescription: string;
  resumePaymentTitle: string;
  submitAction: string;
  submitErrorDescription: string;
  submitErrorTitle: string;
  submitSuccessDescription: string;
  submitSuccessTitle: string;
  subtitle: string;
  supportHint: string;
  title: string;
  titleHighlight: string;
  email: string;
}
