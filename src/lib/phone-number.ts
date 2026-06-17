const NON_DIGIT_PATTERN = /\D/g;

export const normalizePhoneNumber = (value: string | null | undefined) => {
  const trimmedValue = value?.trim() ?? "";
  if (!trimmedValue) {
    return null;
  }

  const hasLeadingPlus = trimmedValue.startsWith("+");
  const digits = trimmedValue.replace(NON_DIGIT_PATTERN, "");
  if (!digits) {
    return null;
  }

  return hasLeadingPlus ? `+${digits}` : digits;
};

export const getPhoneNumberComparisonKey = (value: string | null | undefined) => {
  const normalizedPhoneNumber = normalizePhoneNumber(value);
  if (!normalizedPhoneNumber) {
    return null;
  }

  return normalizedPhoneNumber.replace(NON_DIGIT_PATTERN, "");
};

export const buildInternationalPhoneNumber = (countryCode: string, localNumber: string) => {
  const normalizedCountryCode = normalizePhoneNumber(countryCode);
  const normalizedLocalNumber = localNumber.replace(NON_DIGIT_PATTERN, "");

  if (!normalizedCountryCode || !normalizedLocalNumber) {
    return "";
  }

  const countryDigits = normalizedCountryCode.replace(NON_DIGIT_PATTERN, "");
  return `+${countryDigits}${normalizedLocalNumber}`;
};
