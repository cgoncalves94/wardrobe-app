"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus, Star, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/sonner";

export type GalleryItem = {
  id: string;
  name: string;
  image_url?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  is_favorite?: boolean;
  created_at?: string | null;
};

export type GalleryCategory = {
  id: string;
  name: string;
};

type Props = {
  items: GalleryItem[];
  categories: GalleryCategory[];
  onSelectCategory?: (id: string | null) => void;
};

export default function ItemsGallery({
  items: initialItems,
  categories,
  onSelectCategory,
}: Props) {
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();
  const t = useTranslations();

  // Close with Escape
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">{t('items.title')}</h2>
        <Link
          href="/items/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          {t('items.addItem')}
        </Link>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
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
        <button
          type="button"
          onClick={() => {
            setShowFavoritesOnly(!showFavoritesOnly);
            if (!showFavoritesOnly) setCategory(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-1.5 ${
            showFavoritesOnly
              ? "bg-foreground text-background"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
          {t('common.favorites')}
        </button>
        <div className="w-px h-8 bg-border mx-1" />
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setCategory(c.id);
              setShowFavoritesOnly(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedCategoryId === c.id && !showFavoritesOnly
                ? "bg-foreground text-background"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filteredItems.length > 0 ? (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredItems.map((it) => (
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
                    {t('common.added')} {new Date(it.created_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
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
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
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
                    <> &bull; {t('common.added')} {new Date(selectedItem.created_at).toLocaleDateString()}</>
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
