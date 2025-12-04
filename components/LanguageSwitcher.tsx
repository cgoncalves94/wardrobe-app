"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { locales, localeConfig, type Locale } from "@/i18n/config";

type Props = {
  currentLocale: Locale;
};

export default function LanguageSwitcher({ currentLocale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
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
      <Globe className="w-4 h-4 text-muted-foreground mr-1" />
      {locales.map((locale, index) => (
        <span key={locale} className="flex items-center">
          {index > 0 && <span className="text-muted-foreground/50 mx-0.5">/</span>}
          <button
            type="button"
            onClick={() => handleChange(locale)}
            disabled={isPending}
            className={`px-1 py-0.5 rounded transition-colors ${
              currentLocale === locale
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {localeConfig[locale].code}
          </button>
        </span>
      ))}
    </div>
  );
}
