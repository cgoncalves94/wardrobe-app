"use client";

import { useRouter } from "next/navigation";
import { useTransition, useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { locales, localeConfig, defaultLocale, type Locale } from "@/i18n/config";

/**
 * Language switcher for unauthenticated pages (reads locale from cookie)
 */
export default function LoginLanguageSwitcher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentLocale, setCurrentLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const cookieLocale = document.cookie
      .split("; ")
      .find((row) => row.startsWith("NEXT_LOCALE="))
      ?.split("=")[1] as Locale | undefined;
    if (cookieLocale && locales.includes(cookieLocale)) {
      setCurrentLocale(cookieLocale);
    }
  }, []);

  const handleChange = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    setCurrentLocale(newLocale);
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div
      className={`flex items-center gap-1 text-sm ${isPending ? 'opacity-50' : ''}`}
      role="group"
      aria-label="Select language"
    >
      <Globe className="w-4 h-4 text-neutral-500 dark:text-neutral-400 mr-1" />
      {locales.map((locale, index) => (
        <span key={locale} className="flex items-center">
          {index > 0 && <span className="text-neutral-300 dark:text-neutral-600 mx-0.5">/</span>}
          <button
            type="button"
            onClick={() => handleChange(locale)}
            disabled={isPending}
            className={`px-1 py-0.5 rounded transition-colors ${
              currentLocale === locale
                ? "text-neutral-900 dark:text-neutral-100 font-medium"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            {localeConfig[locale].code}
          </button>
        </span>
      ))}
    </div>
  );
}
