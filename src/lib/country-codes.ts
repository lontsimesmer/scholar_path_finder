export const countryCodes = [
  { code: "+1", country: "US" },
  { code: "+44", country: "UK" },
  { code: "+33", country: "FR" },
  { code: "+49", country: "DE" },
  { code: "+237", country: "CM" },
  { code: "+234", country: "NG" },
  { code: "+254", country: "KE" },
  { code: "+27", country: "ZA" },
  { code: "+86", country: "CN" },
  { code: "+91", country: "IN" },
  { code: "+81", country: "JP" },
  { code: "+82", country: "KR" },
  { code: "+61", country: "AU" },
  { code: "+55", country: "BR" },
  { code: "+52", country: "MX" },
  { code: "+39", country: "IT" },
  { code: "+34", country: "ES" },
  { code: "+31", country: "NL" },
  { code: "+32", country: "BE" },
  { code: "+41", country: "CH" },
  { code: "+43", country: "AT" },
  { code: "+48", country: "PL" },
  { code: "+46", country: "SE" },
  { code: "+47", country: "NO" },
  { code: "+45", country: "DK" },
  { code: "+358", country: "FI" },
  { code: "+7", country: "RU" },
  { code: "+90", country: "TR" },
  { code: "+966", country: "SA" },
  { code: "+971", country: "AE" },
  { code: "+20", country: "EG" },
  { code: "+212", country: "MA" },
  { code: "+225", country: "CI" },
  { code: "+221", country: "SN" },
] as const;

export const splitInternationalPhoneNumber = (
  value: string | null | undefined,
  fallbackCountryCode = "+237",
) => {
  const normalizedValue = value?.replace(/\s+/g, "").trim() ?? "";
  if (!normalizedValue) {
    return {
      countryCode: fallbackCountryCode,
      localNumber: "",
    };
  }

  const matchingCode = [...countryCodes]
    .map((country) => country.code)
    .sort((left, right) => right.length - left.length)
    .find((code) => normalizedValue.startsWith(code));

  if (!matchingCode) {
    return {
      countryCode: fallbackCountryCode,
      localNumber: normalizedValue.replace(/^\+/, ""),
    };
  }

  return {
    countryCode: matchingCode,
    localNumber: normalizedValue.slice(matchingCode.length),
  };
};
