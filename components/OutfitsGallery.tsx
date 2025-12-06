"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { Plus, Sparkles, Star, Trash2, X, Wand2, Shirt, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/sonner";

/** Responsive page sizes: 6 for 1-col mobile, 12 for 2-4 col desktop (3 rows of 4) */
const OUTFITS_PER_PAGE_MOBILE = 6;
const OUTFITS_PER_PAGE_DESKTOP = 12;

/** Outfit data for gallery display */
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

/**
 * Tabbed gallery for generated outfits and try-ons with favorites and lightbox
 */
export default function OutfitsGallery({ outfits: initialOutfits, tryons: initialTryons = [] }: Props) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [outfits, setOutfits] = useState<Outfit[]>(initialOutfits);
  const [tryons, setTryons] = useState<Outfit[]>(initialTryons);
  const [activeTab, setActiveTab] = useState<TabType>(tabParam === "tryons" ? "tryons" : "outfits");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [outfitsPerPage, setOutfitsPerPage] = useState(OUTFITS_PER_PAGE_DESKTOP);
  const [currentPage, setCurrentPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeList = activeTab === "outfits" ? outfits : tryons;

  const filteredItems = useMemo(() => {
    if (showFavoritesOnly) {
      return activeList.filter((o) => o.is_favorite);
    }
    return activeList;
  }, [activeList, showFavoritesOnly]);

  // Paginated items for current page
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(
      currentPage * outfitsPerPage,
      (currentPage + 1) * outfitsPerPage
    );
  }, [filteredItems, currentPage, outfitsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / outfitsPerPage);

  const supabase = createClient();
  const t = useTranslations();
  const format = useFormatter();

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

  // Responsive pagination - sync with grid breakpoint (sm: 640px)
  useEffect(() => {
    function updatePageSize() {
      const isDesktop = window.innerWidth >= 640;
      setOutfitsPerPage(isDesktop ? OUTFITS_PER_PAGE_DESKTOP : OUTFITS_PER_PAGE_MOBILE);
    }
    updatePageSize();
    window.addEventListener("resize", updatePageSize);
    return () => window.removeEventListener("resize", updatePageSize);
  }, []);

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
    <div className="space-y-5 pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab("outfits");
            setShowFavoritesOnly(false);
            setCurrentPage(0);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "outfits"
              ? "bg-foreground text-background"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          }`}
        >
          <Wand2 className="w-4 h-4" />
          {t('outfits.tabOutfits')}
          {outfits.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === "outfits" ? "bg-background/20" : "bg-foreground/10"
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
            setCurrentPage(0);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "tryons"
              ? "bg-foreground text-background"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          }`}
        >
          <Shirt className="w-4 h-4" />
          {t('outfits.tabTryOns')}
          {tryons.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === "tryons" ? "bg-background/20" : "bg-foreground/10"
            }`}>
              {tryons.length}
            </span>
          )}
        </button>

        {activeList.length > 0 && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <button
              type="button"
              onClick={() => {
                setShowFavoritesOnly(!showFavoritesOnly);
                setCurrentPage(0);
              }}
              className={`p-2 rounded-lg transition-all ${
                showFavoritesOnly
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              }`}
              aria-label={showFavoritesOnly ? t('aria.showAll') : t('aria.showFavorites')}
              title={showFavoritesOnly ? t('common.showingFavorites') : t('common.showFavorites')}
            >
              <Star className={`w-4 h-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
            </button>
          </>
        )}
      </div>

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
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {paginatedItems.map((outfit) => (
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

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              {t("common.previous")}
            </button>
            <span className="text-sm text-muted-foreground">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              {t("common.next")}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        </>
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
