import { getTranslations } from "next-intl/server";
import { getUserSubscription } from "@/lib/supabase/subscription";
import { getProFeatures } from "@/lib/features";
import { Sparkles, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function UpgradePage() {
  const t = await getTranslations("pro");
  const tCommon = await getTranslations("common");
  const subscription = await getUserSubscription();
  const proFeatures = getProFeatures();

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {tCommon("backToHome")}
      </Link>

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full bg-foreground text-background text-xs font-medium">
          <Sparkles className="w-3 h-3" />
          {t("badge")}
        </div>
        <h1 className="text-3xl font-semibold mb-3">{t("upgradeTitle")}</h1>
        <p className="text-muted-foreground">{t("upgradeDescription")}</p>
      </div>

      {/* Current Plan */}
      <div className="mb-8 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t("currentPlan")}
          </span>
          <span className="font-medium">
            {subscription?.isPro ? t("proPlan") : t("freePlan")}
          </span>
        </div>
      </div>

      {/* Pro Features */}
      <div className="rounded-xl border border-border bg-card p-6 mb-8">
        <h2 className="font-semibold mb-6">
          {t("proPlan")} {t("includesFeatures")}
        </h2>
        <div className="space-y-4">
          {proFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.titleKey} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-foreground/70" />
                </div>
                <div>
                  <h3 className="font-medium">{t(`features.${feature.titleKey}`)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`features.${feature.descKey}`)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      {!subscription?.isPro ? (
        <div className="text-center p-6 rounded-xl border border-dashed border-border">
          <p className="text-muted-foreground mb-2">{t("stripeComingSoon")}</p>
          <p className="text-sm text-muted-foreground">
            {t("contactSupport")}
          </p>
        </div>
      ) : (
        <div className="text-center p-6 rounded-xl border border-border bg-card">
          <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="font-medium">{t("youArePro")}</p>
        </div>
      )}
    </div>
  );
}
