import Link from "next/link";
import { ArrowLeft, Construction, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getUserSubscription } from "@/lib/supabase/subscription";
import { isProRoute } from "@/lib/features";
import ProFeatureGate from "@/components/ProFeatureGate";

export default async function TryOnPage() {
  const t = await getTranslations();
  const subscription = await getUserSubscription();

  const features = [
    { emoji: "📸", titleKey: "uploadPhoto", descKey: "uploadPhotoDesc" },
    { emoji: "👗", titleKey: "selectOutfit", descKey: "selectOutfitDesc" },
    { emoji: "✨", titleKey: "aiMagic", descKey: "aiMagicDesc" },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/outfits"
          className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">{t("outfits.tryOn.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("outfits.tryOn.description")}
          </p>
        </div>
      </div>

      {/* Pro Gate or Coming Soon */}
      {isProRoute("/outfits/try-on") && !subscription?.isPro ? (
        <ProFeatureGate featureKey="tryOn" />
      ) : (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-secondary flex items-center justify-center">
            <Construction className="w-8 h-8 text-foreground/70" />
          </div>
          <h2 className="text-xl font-semibold mb-3">{t("outfits.tryOn.comingSoon")}</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6 px-4">
            {t("outfits.tryOn.comingSoonDescription")}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            <span>{t("outfits.tryOn.poweredBy")}</span>
          </div>
        </div>
      )}

      {/* Feature Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((item) => (
          <div key={item.titleKey} className="p-6 rounded-xl border border-border bg-card text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-secondary flex items-center justify-center">
              <span className="text-2xl">{item.emoji}</span>
            </div>
            <h3 className="font-medium mb-1">{t(`outfits.tryOn.${item.titleKey}`)}</h3>
            <p className="text-xs text-muted-foreground">{t(`outfits.tryOn.${item.descKey}`)}</p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Link
          href="/outfits/generate"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border hover:bg-secondary transition-colors"
        >
          {t("outfits.tryOn.tryGeneratorInstead")}
        </Link>
      </div>
    </div>
  );
}
