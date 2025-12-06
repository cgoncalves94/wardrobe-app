"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations, useFormatter } from "next-intl";
import { Plus, Star, Trash2, Wand2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/sonner";
import CategoryDropdown from "@/components/CategoryDropdown";
import type { CategoryRoot } from "@/lib/categories";

/** Number of items to show per page in the grid */
const ITEMS_PER_PAGE = 12;

/** Item data for gallery display */
export type GalleryItem = {
  id: string;
  name: string;
  image_url?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  is_favorite?: boolean;
  created_at?: string | null;
};

/** Category data for filtering */
export type GalleryCategory = {
  id: string;
  name: string;
  root: CategoryRoot;
};

type Props = {
  items: GalleryItem[];
  categories: GalleryCategory[];
  onSelectCategory?: (id: string | null) => void;
};

/**
 * Filterable gallery grid for wardrobe items with lightbox and favorites
 */
export default function ItemsGallery({
  items: initialItems,
  categories,
  onSelectCategory,
}: Props) {
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();
  const t = useTranslations();
  const format = useFormatter();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setSelectedItem(null);
      }
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const setCategory = (id: string | null) => {
    if (onSelectCategory) onSelectCategory(id);
    setSelectedCategoryId(id);
    setShowFavoritesOnly(false);
    setCurrentPage(0);
  };

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (selectedCategoryId) {
      filtered = filtered.filter((it) => it.category_id === selectedCategoryId);
    }
    if (showFavoritesOnly) {
      filtered = filtered.filter((it) => it.is_favorite);
    }
    return filtered;
  }, [items, selectedCategoryId, showFavoritesOnly]);

  // Paginated items for current page
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(
      currentPage * ITEMS_PER_PAGE,
      (currentPage + 1) * ITEMS_PER_PAGE
    );
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

  async function handleDelete(item: GalleryItem) {
    if (!confirm(t('items.deleteConfirm', { name: item.name }))) return;

    setDeleting(true);
    try {
      // Delete from database first
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      // Also delete image from storage if it exists
      if (item.image_url) {
        // Extract path from URL: .../storage/v1/object/public/wardrobe/filename.jpg
        const match = item.image_url.match(/\/wardrobe\/(.+?)(?:\?.*)?$/);
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

      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setOpen(false);
      setSelectedItem(null);
      toast.success(t('items.itemDeleted'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('items.failedToDelete');
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  async function toggleFavorite(item: GalleryItem) {
    const newValue = !item.is_favorite;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, is_favorite: newValue } : i
      )
    );
    if (selectedItem?.id === item.id) {
      setSelectedItem({ ...selectedItem, is_favorite: newValue });
    }

    try {
      const { error } = await supabase
        .from("items")
        .update({ is_favorite: newValue })
        .eq("id", item.id);

      if (error) throw error;
    } catch {
      // Revert on error
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_favorite: !newValue } : i
        )
      );
      toast.error(t('items.failedToUpdateFavorite'));
    }
  }

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('items.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('items.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/outfits/generate"
            className="hidden lg:inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border hover:bg-secondary transition-colors font-medium"
          >
            <Wand2 className="w-4 h-4" />
            {t('outfits.createOutfit')}
          </Link>
          <Link
            href="/items/new"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {t('items.addItem')}
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setCategory(null);
            setShowFavoritesOnly(false);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedCategoryId === null && !showFavoritesOnly
              ? "bg-foreground text-background"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          }`}
        >
          {t('common.all')}
        </button>

        {/* Favorites toggle */}
        <button
          type="button"
          onClick={() => {
            setShowFavoritesOnly((prev) => !prev);
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

        {/* Category dropdown */}
        {categories.length > 0 && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <CategoryDropdown
              categories={categories}
              selectedId={showFavoritesOnly ? null : selectedCategoryId}
              onSelect={setCategory}
            />
          </>
        )}
      </div>

      {/* Grid */}
      {filteredItems.length > 0 ? (
        <>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {paginatedItems.map((it, index) => (
            <li
              key={it.id}
              className="group rounded-xl border border-border bg-card overflow-hidden hover:border-foreground/20 transition-all"
            >
              <button
                type="button"
                className="relative aspect-square w-full overflow-hidden bg-secondary focus:outline-none"
                onClick={() => {
                  setSelectedItem(it);
                  setOpen(true);
                }}
                aria-label={t('aria.openItem', { name: it.name })}
              >
                {it.image_url ? (
                  <Image
                    src={it.image_url}
                    alt={it.name}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-105"
                    sizes="400px"
                    priority={index < 4}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    {t('common.noImage')}
                  </div>
                )}
                {it.is_favorite && (
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/90 flex items-center justify-center shadow-sm">
                    <Star className="w-4 h-4 text-foreground fill-foreground" />
                  </div>
                )}
              </button>
              <div className="p-4 space-y-1">
                <div className="font-medium">{it.name}</div>
                <div className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary text-muted-foreground">
                  {it.category_name || t('common.uncategorized')}
                </div>
                {it.created_at && (
                  <div className="text-xs text-muted-foreground">
                    {t('common.added')} {format.dateTime(new Date(it.created_at), {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

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
            {showFavoritesOnly ? (
              <Star className="w-7 h-7 text-muted-foreground" />
            ) : (
              <Plus className="w-7 h-7 text-muted-foreground" />
            )}
          </div>
          <p className="text-muted-foreground mb-4">
            {showFavoritesOnly
              ? t('items.noFavoriteItems')
              : t('items.noItemsCategory')}
          </p>
          {!showFavoritesOnly && (
            <Link
              href="/items/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              {t('items.addFirstItem')}
            </Link>
          )}
        </div>
      )}

      {/* Lightbox */}
      {open && selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => {
            setOpen(false);
            setSelectedItem(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSelectedItem(null);
              }}
              className="absolute top-2 right-2 sm:-top-12 sm:right-0 p-3 rounded-full bg-black/40 sm:bg-transparent text-white/80 hover:text-white hover:bg-black/60 sm:hover:bg-transparent transition-colors z-10"
              aria-label={t('aria.closeDialog')}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Image */}
            {selectedItem.image_url ? (
              <Image
                src={selectedItem.image_url}
                alt={selectedItem.name}
                width={1600}
                height={1600}
                className="h-auto w-full rounded-xl object-contain"
                sizes="(max-width: 1024px) 100vw, 1024px"
              />
            ) : (
              <div className="aspect-square w-full rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
                {t('common.noImage')}
              </div>
            )}

            {/* Info bar */}
            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-white/10 backdrop-blur-md p-4">
              <div className="min-w-0">
                <h3 className="font-medium text-white truncate">
                  {selectedItem.name}
                </h3>
                <p className="text-sm text-white/60">
                  {selectedItem.category_name || t('common.uncategorized')}
                  {selectedItem.created_at && (
                    <> &bull; {t('common.added')} {format.dateTime(new Date(selectedItem.created_at), {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(selectedItem);
                  }}
                  className={`p-2.5 rounded-lg transition-colors ${
                    selectedItem.is_favorite
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                  }`}
                  aria-label={
                    selectedItem.is_favorite
                      ? t('aria.removeFromFavorites')
                      : t('aria.addToFavorites')
                  }
                >
                  <Star
                    className={`w-5 h-5 ${
                      selectedItem.is_favorite ? "fill-current" : ""
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(selectedItem);
                  }}
                  disabled={deleting}
                  className="p-2.5 rounded-lg bg-white/10 text-white/70 hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-50"
                  aria-label={t('aria.deleteItem')}
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
