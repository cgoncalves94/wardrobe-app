import Link from "next/link";
import { Sparkles, Shirt, Wand2, Plus, ArrowRight, Camera, FolderOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getUserSubscription } from "@/lib/supabase/subscription";
import { isProRoute } from "@/lib/features";
import ProBadge from "@/components/ProBadge";

export default async function Home() {
  const t = await getTranslations("home");
  const tNav = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const tPro = await getTranslations("pro");
  const subscription = await getUserSubscription();

  return (
    <div className="space-y-10 md:space-y-16 pb-4">
      {/* Hero Section */}
      <section className="relative py-8 md:py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-muted-foreground mb-4 animate-fade-up">
            {t("badge")}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight tracking-tight mb-6 animate-fade-up delay-100">
            {t("title")}
            <br />
            <span className="text-muted-foreground">{t("titleAccent")}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mb-8 animate-fade-up delay-200">
            {t("description")}
          </p>
          <div className="flex flex-wrap gap-4 animate-fade-up delay-300">
            <Link
              href="/outfits/generate"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
            >
              <Wand2 className="w-4 h-4" />
              {t("createOutfit")}
            </Link>
            <Link
              href="/items/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              <Plus className="w-4 h-4" />
              {tNav("addItem")}
            </Link>
          </div>
        </div>

        {/* Decorative element */}
        <div className="hidden lg:block absolute top-8 right-0 w-72 h-72">
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-secondary/80 rounded-3xl rotate-6" />
            <div className="absolute inset-0 bg-card border border-border rounded-3xl -rotate-3 flex items-center justify-center">
              <Sparkles className="w-16 h-16 text-muted-foreground/40" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-xl font-semibold mb-4 md:mb-6">{t("howItWorks")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="flex flex-col items-center text-center p-4 md:p-6 rounded-xl bg-secondary/50">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-foreground/10 flex items-center justify-center mb-3 md:mb-4">
              <Camera className="w-6 h-6 md:w-7 md:h-7 text-foreground/70" />
            </div>
            <h3 className="font-medium mb-1 md:mb-2">{t("step1Title")}</h3>
            <p className="text-sm text-muted-foreground">{t("step1Description")}</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 md:p-6 rounded-xl bg-secondary/50">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-foreground/10 flex items-center justify-center mb-3 md:mb-4">
              <FolderOpen className="w-6 h-6 md:w-7 md:h-7 text-foreground/70" />
            </div>
            <h3 className="font-medium mb-1 md:mb-2">{t("step2Title")}</h3>
            <p className="text-sm text-muted-foreground">{t("step2Description")}</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 md:p-6 rounded-xl bg-secondary/50">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-foreground/10 flex items-center justify-center mb-3 md:mb-4">
              <Wand2 className="w-6 h-6 md:w-7 md:h-7 text-foreground/70" />
            </div>
            <h3 className="font-medium mb-1 md:mb-2">{t("step3Title")}</h3>
            <p className="text-sm text-muted-foreground">{t("step3Description")}</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-xl font-semibold mb-4 md:mb-6">{t("features")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="p-6 rounded-xl border border-border bg-card relative flex flex-col h-full">
            {isProRoute("/outfits/generate") && !subscription?.isPro && (
              <ProBadge label={tPro("badge")} />
            )}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-foreground/70" />
              </div>
              <div>
                <h3 className="font-medium mb-1">{t("aiOutfitGenerator")}</h3>
                <p className="text-sm text-muted-foreground">{t("mixMatch")}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {t("aiOutfitGeneratorDescription")}
            </p>
            <Link
              href="/outfits/generate"
              className="inline-flex items-center gap-1 text-sm font-medium hover:gap-2 transition-all mt-auto"
            >
              {tCommon("tryItNow")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card relative flex flex-col h-full">
            {isProRoute("/outfits/try-on") && !subscription?.isPro && (
              <ProBadge label={tPro("badge")} />
            )}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Shirt className="w-5 h-5 text-foreground/70" />
              </div>
              <div>
                <h3 className="font-medium mb-1">{t("virtualTryOn")}</h3>
                <p className="text-sm text-muted-foreground">{t("seeYourselfOutfit")}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {t("virtualTryOnDescription")}
            </p>
            <Link
              href="/outfits/try-on"
              className="inline-flex items-center gap-1 text-sm font-medium hover:gap-2 transition-all mt-auto"
            >
              {tCommon("tryItNow")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
