export const locales = ["en", "pt"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeConfig: Record<Locale, { name: string; flag: string; code: string }> = {
  en: { name: "English", flag: "🇬🇧", code: "EN" },
  pt: { name: "Português", flag: "🇧🇷", code: "PT" },
};

// For backwards compatibility
export const localeNames: Record<Locale, string> = {
  en: "English",
  pt: "Português",
};
