const NON_DIGIT_PATTERN = /[^0-9]+/g;

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
