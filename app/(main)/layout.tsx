import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { getLocale, getTranslations } from "next-intl/server";
import LogoutButton from "@/components/auth/LogoutButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { Locale } from "@/i18n/config";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  const locale = await getLocale() as Locale;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center">
              <svg className="w-4 h-4 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <span className="text-base font-medium">{t("common.appName")}</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              {t("nav.home")}
            </Link>
            <Link href="/items" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              {t("nav.items")}
            </Link>
            <Link href="/outfits" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              {t("nav.outfits")}
            </Link>
            <Link href="/categories" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              {t("nav.categories")}
            </Link>
            <Link
              href="/items/new"
              className="ml-3 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {t("nav.addItem")}
            </Link>
            <div className="ml-4 pl-4 border-l border-border/50 flex items-center gap-3">
              <LanguageSwitcher currentLocale={locale} />
              <LogoutButton />
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-6 py-8 min-h-[calc(100vh-140px)]">
        {children}
      </main>
      <footer className="border-t border-border/50">
        <div className="mx-auto max-w-[1400px] px-6 py-6 text-center text-sm text-muted-foreground">
          {t("common.appStudio")}
        </div>
      </footer>
      <Toaster richColors position="top-right" />
    </>
  );
}
