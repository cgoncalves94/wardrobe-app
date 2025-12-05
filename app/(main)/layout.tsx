import { Toaster } from "@/components/ui/sonner";
import { getLocale, getTranslations } from "next-intl/server";
import Header from "@/components/navigation/Header";
import BottomNav from "@/components/navigation/BottomNav";
import type { Locale } from "@/i18n/config";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  const locale = await getLocale() as Locale;

  return (
    <>
      <Header currentLocale={locale} />
      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 sm:py-8 pb-20 lg:pb-8 min-h-[calc(100vh-140px)]">
        {children}
      </main>
      <footer className="border-t border-border/50 pb-16 lg:pb-0">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 text-center text-sm text-muted-foreground">
          {t("common.appStudio")}
        </div>
      </footer>
      <BottomNav />
      <Toaster richColors position="top-right" />
    </>
  );
}
