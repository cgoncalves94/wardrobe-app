import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Sparkles, Shirt, ArrowRight } from "lucide-react";
import OutfitsGallery from "@/components/OutfitsGallery";
import { getUserSubscription } from "@/lib/supabase/subscription";
import { isProRoute } from "@/lib/features";
import ProBadge from "@/components/ProBadge";
import type { OutfitFolder } from "@/types";

export const revalidate = 0;

async function getOutfitsByType(userId: string, type: "outfit" | "tryon") {
  const supabase = await createClient();

  // Try with folder join first, fallback to basic query if outfit_folders table doesn't exist
  let { data, error } = await supabase
    .from("outfits")
    .select("*, outfit_folders(name)")
    .eq("user_id", userId)
    .eq("type", type)
    .order("created_at", { ascending: false });

  // If folder join fails due to missing table (42P01), fetch without it
  // This handles the migration period when outfit_folders table may not exist
  if (error && error.code === "42P01") {
    const fallback = await supabase
      .from("outfits")
      .select("*")
      .eq("user_id", userId)
      .eq("type", type)
      .order("created_at", { ascending: false });

    if (fallback.error) {
      console.error(`Error fetching ${type}s:`, fallback.error);
      return [];
    }
    return (fallback.data || []).map((outfit) => ({
      ...outfit,
      folder_name: null,
    }));
  }

  // Handle other errors
  if (error) {
    console.error(`Error fetching ${type}s:`, error);
    return [];
  }

  // Map folder name to outfit for display
  return (data || []).map((outfit) => ({
    ...outfit,
    folder_name: outfit.outfit_folders?.name || null,
  }));
}

async function getFolders(userId: string): Promise<OutfitFolder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outfit_folders")
    .select("*")
    .eq("user_id", userId)
    .order("name");

  if (error) {
    console.error("Error fetching folders:", error);
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

  // Fetch outfits, try-ons, and folders in parallel
  const [outfits, tryons, folders] = await Promise.all([
    getOutfitsByType(user.id, "outfit"),
    getOutfitsByType(user.id, "tryon"),
    getFolders(user.id),
  ]);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{t('outfits.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('outfits.description')}
        </p>
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

      {/* Saved Outfits & Try-Ons */}
      <div>
        <OutfitsGallery outfits={outfits} tryons={tryons} folders={folders} />
      </div>
    </div>
  );
}
