"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations, useFormatter } from "next-intl";
import { Plus, Sparkles, Star, Trash2, X, Wand2, Shirt } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/sonner";

export type Outfit = {
  id: string;
  name: string;
  generated_image_url?: string | null;
  is_favorite?: boolean;
  created_at: string;
};

type TabType = "outfits" | "tryons";

type Props = {
  outfits: Outfit[];
  tryons?: Outfit[];
};

export default function OutfitsGallery({ outfits: initialOutfits, tryons: initialTryons = [] }: Props) {
  const [outfits, setOutfits] = useState<Outfit[]>(initialOutfits);
  const [tryons, setTryons] = useState<Outfit[]>(initialTryons);
  const [activeTab, setActiveTab] = useState<TabType>("outfits");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Get active list based on tab
  const activeList = activeTab === "outfits" ? outfits : tryons;
  const setActiveList = activeTab === "outfits" ? setOutfits : setTryons;

  const filteredItems = useMemo(() => {
    if (showFavoritesOnly) {
      return activeList.filter((o) => o.is_favorite);
    }
    return activeList;
  }, [activeList, showFavoritesOnly]);

  const supabase = createClient();
  const t = useTranslations();
  const format = useFormatter();

  // Close with Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setSelectedOutfit(null);
      }
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  async function handleDelete(outfit: Outfit) {
    if (!confirm(t('outfits.deleteConfirm', { name: outfit.name }))) return;

    setDeleting(true);
    try {
      // Delete from database first
      const { error } = await supabase
        .from("outfits")
        .delete()
        .eq("id", outfit.id);

      if (error) throw error;

      // Also delete generated image from storage if it exists
      if (outfit.generated_image_url) {
        // Extract path from URL: .../storage/v1/object/public/wardrobe/outfits/filename.jpg
        const match = outfit.generated_image_url.match(/\/wardrobe\/(.+?)(?:\?.*)?$/);
        if (match) {
          const storagePath = match[1];
          const { error: storageError } = await supabase.storage
            .from("wardrobe")
            .remove([storagePath]);
          if (storageError) {
            console.error("Failed to delete image from storage:", storageError);
          }
        }
      }

      // Remove from the correct list
      if (activeTab === "outfits") {
        setOutfits((prev) => prev.filter((o) => o.id !== outfit.id));
      } else {
        setTryons((prev) => prev.filter((o) => o.id !== outfit.id));
      }
      setOpen(false);
      setSelectedOutfit(null);
      toast.success(activeTab === "outfits" ? t('outfits.outfitDeleted') : t('outfits.tryOn.tryOnDeleted'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('outfits.failedToDelete');
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  async function toggleFavorite(outfit: Outfit) {
    const newValue = !outfit.is_favorite;

    // Optimistic update - update the correct list
    const updateList = (prev: Outfit[]) =>
      prev.map((o) =>
        o.id === outfit.id ? { ...o, is_favorite: newValue } : o
      );

    if (activeTab === "outfits") {
      setOutfits(updateList);
    } else {
      setTryons(updateList);
    }

    if (selectedOutfit?.id === outfit.id) {
      setSelectedOutfit({ ...selectedOutfit, is_favorite: newValue });
    }

    try {
      const { error } = await supabase
        .from("outfits")
        .update({ is_favorite: newValue })
        .eq("id", outfit.id);

      if (error) throw error;
    } catch {
      // Revert on error
      const revertList = (prev: Outfit[]) =>
        prev.map((o) =>
          o.id === outfit.id ? { ...o, is_favorite: !newValue } : o
        );

      if (activeTab === "outfits") {
        setOutfits(revertList);
      } else {
        setTryons(revertList);
      }
      toast.error(t('outfits.failedToUpdateFavorite'));
    }
  }

  // Empty state when both lists are empty
  if (outfits.length === 0 && tryons.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border py-16 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-secondary flex items-center justify-center">
          <Plus className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg mb-2">{t('outfits.noOutfitsTitle')}</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          {t('outfits.noOutfitsDescription')}
        </p>
        <Link
          href="/outfits/generate"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border hover:bg-secondary transition-colors"
        >
          {t('outfits.createFirstOutfit')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit">
        <button
          type="button"
          onClick={() => {
            setActiveTab("outfits");
            setShowFavoritesOnly(false);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "outfits"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wand2 className="w-4 h-4" />
          {t('outfits.tabOutfits')}
          {outfits.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === "outfits" ? "bg-secondary" : "bg-background/50"
            }`}>
              {outfits.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("tryons");
            setShowFavoritesOnly(false);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "tryons"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shirt className="w-4 h-4" />
          {t('outfits.tabTryOns')}
          {tryons.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === "tryons" ? "bg-secondary" : "bg-background/50"
            }`}>
              {tryons.length}
            </span>
          )}
        </button>
      </div>

      {/* Filter chips */}
      {activeList.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowFavoritesOnly(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              !showFavoritesOnly
                ? "bg-foreground text-background"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            {t('common.all')}
          </button>
          <button
            type="button"
            onClick={() => setShowFavoritesOnly(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-1.5 ${
              showFavoritesOnly
                ? "bg-foreground text-background"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
            {t('common.favorites')}
          </button>
        </div>
      )}

      {/* Content */}
      {activeList.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border py-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-secondary flex items-center justify-center">
            {activeTab === "outfits" ? (
              <Wand2 className="w-7 h-7 text-muted-foreground" />
            ) : (
              <Shirt className="w-7 h-7 text-muted-foreground" />
            )}
          </div>
          <h3 className="font-medium text-lg mb-2">
            {activeTab === "outfits" ? t('outfits.noOutfitsTitle') : t('outfits.noTryOnsTitle')}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            {activeTab === "outfits" ? t('outfits.noOutfitsDescription') : t('outfits.noTryOnsDescription')}
          </p>
          <Link
            href={activeTab === "outfits" ? "/outfits/generate" : "/outfits/try-on"}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            {activeTab === "outfits" ? t('outfits.createFirstOutfit') : t('outfits.createFirstTryOn')}
          </Link>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((outfit) => (
          <button
            key={outfit.id}
            type="button"
            onClick={() => {
              setSelectedOutfit(outfit);
              setOpen(true);
            }}
            className="group rounded-xl border border-border bg-card overflow-hidden hover:border-foreground/20 transition-all text-left"
          >
            <div className="aspect-square relative overflow-hidden bg-secondary">
              {outfit.generated_image_url ? (
                <Image
                  src={outfit.generated_image_url}
                  alt={outfit.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-muted-foreground/30" />
                </div>
              )}
              {outfit.is_favorite && (
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/90 flex items-center justify-center shadow-sm">
                  <Star className="w-4 h-4 text-foreground fill-foreground" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-medium truncate">{outfit.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {format.dateTime(new Date(outfit.created_at), {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </button>
        ))}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border py-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-secondary flex items-center justify-center">
            <Star className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            {activeTab === "outfits" ? t('outfits.noFavoriteOutfits') : t('outfits.noFavoriteTryOns')}
          </p>
        </div>
      )}

      {/* Lightbox */}
      {open && selectedOutfit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => {
            setOpen(false);
            setSelectedOutfit(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSelectedOutfit(null);
              }}
              className="block sticky top-0 ml-auto mb-2 p-3 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-colors z-10"
              aria-label={t('aria.closeDialog')}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Image */}
            {selectedOutfit.generated_image_url && (
              <Image
                src={selectedOutfit.generated_image_url}
                alt={selectedOutfit.name}
                width={1600}
                height={1600}
                className="h-auto w-full rounded-xl object-contain"
                sizes="(max-width: 1024px) 100vw, 1024px"
              />
            )}

            {/* Info bar */}
            <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-4 rounded-xl bg-white/10 backdrop-blur-md p-4">
              <div className="min-w-0">
                <h3 className="font-medium text-white truncate">
                  {selectedOutfit.name}
                </h3>
                <p className="text-sm text-white/60">
                  {format.dateTime(new Date(selectedOutfit.created_at), {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(selectedOutfit);
                  }}
                  className={`p-2.5 rounded-lg transition-colors ${
                    selectedOutfit.is_favorite
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                  }`}
                  aria-label={
                    selectedOutfit.is_favorite
                      ? t('aria.removeFromFavorites')
                      : t('aria.addToFavorites')
                  }
                >
                  <Star
                    className={`w-5 h-5 ${
                      selectedOutfit.is_favorite ? "fill-current" : ""
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(selectedOutfit);
                  }}
                  disabled={deleting}
                  className="p-2.5 rounded-lg bg-white/10 text-white/70 hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-50"
                  aria-label={t('aria.deleteOutfit')}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
