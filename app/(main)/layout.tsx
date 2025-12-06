import { Toaster } from "@/components/ui/sonner";
import { getLocale, getTranslations } from "next-intl/server";
import Header from "@/components/navigation/Header";
import BottomNav from "@/components/navigation/BottomNav";
import type { Locale } from "@/i18n/config";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  const locale = await getLocale() as Locale;

  return (
    <div className="lg:min-h-screen lg:flex lg:flex-col">
      <Header currentLocale={locale} />
      <main className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-12 py-6 sm:py-8 pb-20 lg:pb-8 lg:flex-1">
        {children}
      </main>
      <footer className="hidden lg:block border-t border-border/50 mt-auto">
        <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-12 py-6 text-center text-sm text-muted-foreground">
          {t("common.appStudio")}
        </div>
      </footer>
      <BottomNav />
      <Toaster richColors position="top-right" />
    </div>
  );
}
