import Link from "next/link";
import { Sparkles, Shirt, Wand2, FolderOpen, Plus, ArrowRight, Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getUserSubscription } from "@/lib/supabase/subscription";
import { isProRoute } from "@/lib/features";

export default async function Home() {
  const t = await getTranslations("home");
  const tNav = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const tPro = await getTranslations("pro");
  const subscription = await getUserSubscription();

  const quickActions: {
    href: string;
    icon: typeof Wand2;
    title: string;
    description: string;
  }[] = [
    {
      href: "/outfits/generate",
      icon: Wand2,
      title: t("aiOutfit"),
      description: t("aiOutfitDescription"),
    },
    {
      href: "/items",
      icon: Shirt,
      title: t("myWardrobe"),
      description: t("myWardrobeDescription"),
    },
    {
      href: "/items/new",
      icon: Plus,
      title: tNav("addItem"),
      description: t("uploadClothes"),
    },
    {
      href: "/categories",
      icon: FolderOpen,
      title: tNav("categories"),
      description: t("organizeItems"),
    },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative py-12 md:py-20">
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

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-semibold mb-6">{t("quickActions")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((item) => (
            <Link key={item.href} href={item.href} className="group">
              <div className="h-full p-6 rounded-xl border border-border bg-card hover:border-foreground/20 hover:bg-secondary/50 transition-all duration-300 relative">
                {isProRoute(item.href) && !subscription?.isPro && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-foreground text-background text-xs font-medium">
                    <Lock className="w-3 h-3" />
                    {tPro("badge")}
                  </div>
                )}
                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center bg-secondary transition-transform group-hover:scale-105">
                  <item.icon className="w-6 h-6 text-foreground/70" />
                </div>
                <h3 className="font-medium mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-xl font-semibold mb-6">{t("features")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl border border-border bg-card relative">
            {isProRoute("/outfits/generate") && !subscription?.isPro && (
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-foreground text-background text-xs font-medium">
                <Lock className="w-3 h-3" />
                {tPro("badge")}
              </div>
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
            <p className="text-sm text-muted-foreground mb-4">
              {t("aiOutfitGeneratorDescription")}
            </p>
            <Link
              href="/outfits/generate"
              className="inline-flex items-center gap-1 text-sm font-medium hover:gap-2 transition-all"
            >
              {tCommon("tryItNow")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card relative">
            {isProRoute("/outfits/try-on") && !subscription?.isPro && (
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-foreground text-background text-xs font-medium">
                <Lock className="w-3 h-3" />
                {tPro("badge")}
              </div>
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
            <p className="text-sm text-muted-foreground mb-4">
              {t("virtualTryOnDescription")}
            </p>
            <Link
              href="/outfits/try-on"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground"
            >
              {tCommon("comingSoon")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
