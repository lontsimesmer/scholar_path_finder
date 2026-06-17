export const CONTACT_VERIFICATION_CHANNELS = ["email", "sms"] as const;

export type VerificationChannel = (typeof CONTACT_VERIFICATION_CHANNELS)[number];

export type ContactVerificationText = {
  title: string;
  subtitle: string;
  intro: string;
  invalidLinkTitle: string;
  invalidLinkDescription: string;
  loading: string;
  codeLabel: string;
  codeHint: string;
  verifyButton: string;
  verifyingButton: string;
  resendButton: string;
  sendingButton: string;
  switchChannel: string;
  sentTitle: string;
  sentDescription: string;
  verifiedTitle: string;
  verifiedDescription: string;
  alreadyVerifiedTitle: string;
  alreadyVerifiedDescription: string;
  signInTitle: string;
  signInDescription: string;
  emailChannelLabel: string;
  smsChannelLabel: string;
  emailChannelDescription: string;
  smsChannelDescription: string;
  backToLogin: string;
};

export type ContactVerificationChannelState = {
  required: boolean;
  verified: boolean;
  maskedDestination: string | null;
};

export type ContactVerificationStatus = {
  enabled: boolean;
  verificationRequired: boolean;
  pendingChannels: VerificationChannel[];
  completedChannels: VerificationChannel[];
  channels: Record<VerificationChannel, ContactVerificationChannelState>;
};

export type SendContactVerificationCodeResponse = {
  enabled: boolean;
  verificationRequired: boolean;
  skipped?: boolean;
  alreadyVerified?: boolean;
  channel?: VerificationChannel;
  challengeId?: string | null;
  expiresAt?: string | null;
  maskedDestination?: string | null;
  resent?: boolean;
  cooldownSeconds?: number | null;
};

export type VerifyContactVerificationCodeResponse = {
  enabled: boolean;
  success: boolean;
  channel: VerificationChannel;
  completedChannels: VerificationChannel[];
  pendingChannels: VerificationChannel[];
  fullyVerified: boolean;
};

export const parseVerificationChannels = (value: string | null | undefined): VerificationChannel[] => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is VerificationChannel => item === "email" || item === "sms");
};

export const serializeVerificationChannels = (channels: VerificationChannel[]) => channels.join(",");

export const sanitizeAppRedirect = (value: string | null | undefined, fallback = "/dashboard") => {
  if (!value || !value.startsWith("/")) {
    return fallback;
  }

  return value;
};

export const selectNextPendingVerificationChannel = (
  pendingChannels: VerificationChannel[],
  preferredChannels: VerificationChannel[],
) => {
  const preferredChannel = preferredChannels.find((channel) => pendingChannels.includes(channel));
  return preferredChannel ?? pendingChannels[0] ?? null;
};

export const buildVerifyContactUrl = ({
  token,
  email,
  channels,
  redirect,
}: {
  token?: string | null;
  email?: string | null;
  channels: VerificationChannel[];
  redirect?: string | null;
}) => {
  const searchParams = new URLSearchParams({
    channels: serializeVerificationChannels(channels),
  });

  if (token?.trim()) {
    searchParams.set("token", token.trim());
  }

  if (email?.trim()) {
    searchParams.set("email", email.trim());
  }

  if (redirect?.trim()) {
    searchParams.set("redirect", sanitizeAppRedirect(redirect));
  }

  return `/verify-contact?${searchParams.toString()}`;
};

export const buildLoginFromVerificationUrl = ({
  email,
  redirect,
}: {
  email?: string | null;
  redirect?: string | null;
}) => {
  const searchParams = new URLSearchParams();

  if (email?.trim()) {
    searchParams.set("email", email.trim());
  }

  if (redirect?.trim()) {
    searchParams.set("redirect", sanitizeAppRedirect(redirect));
  }

  const query = searchParams.toString();
  return query ? `/login?${query}` : "/login";
};
