import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Sparkles, Wand2, Shirt, ArrowRight } from "lucide-react";
import OutfitsGallery from "@/components/OutfitsGallery";
import { getUserSubscription } from "@/lib/supabase/subscription";
import { isProRoute } from "@/lib/features";
import ProBadge from "@/components/ProBadge";

export const revalidate = 0;

async function getOutfits(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outfits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching outfits:", error);
    return [];
  }
  return data || [];
}

export default async function OutfitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const t = await getTranslations();
  const subscription = await getUserSubscription();

  if (!user) {
    return <div className="text-center py-12 text-muted-foreground">{t('auth.loginRequired', { resource: t('nav.outfits').toLowerCase() })}</div>;
  }

  const outfits = await getOutfits(user.id);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('outfits.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('outfits.description')}
          </p>
        </div>
        <Link
          href="/outfits/generate"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
        >
          <Wand2 className="w-4 h-4" />
          {t('outfits.createOutfit')}
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/outfits/generate" className="group">
          <div className="p-6 rounded-xl border border-border bg-card hover:border-foreground/20 transition-all flex items-center gap-4 relative">
            {isProRoute("/outfits/generate") && !subscription?.isPro && (
              <ProBadge label={t('pro.badge')} />
            )}
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center transition-transform group-hover:scale-105">
              <Sparkles className="w-6 h-6 text-foreground/70" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{t('outfits.outfitGenerator')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('outfits.outfitGeneratorDescription')}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link href="/outfits/try-on" className="group">
          <div className="p-6 rounded-xl border border-border bg-card hover:border-foreground/20 transition-all flex items-center gap-4 relative">
            {isProRoute("/outfits/try-on") && !subscription?.isPro && (
              <ProBadge label={t('pro.badge')} />
            )}
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center transition-transform group-hover:scale-105">
              <Shirt className="w-6 h-6 text-foreground/70" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{t('outfits.virtualTryOn')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('outfits.virtualTryOnDescription')}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Saved Outfits */}
      <div>
        <h2 className="text-lg font-semibold mb-5">{t('outfits.savedOutfits')}</h2>
        <OutfitsGallery outfits={outfits} />
      </div>
    </div>
  );
}
