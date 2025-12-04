"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Sparkles, Star, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/sonner";

export type Outfit = {
  id: string;
  name: string;
  generated_image_url?: string | null;
  is_favorite?: boolean;
  created_at: string;
};

type Props = {
  outfits: Outfit[];
};

export default function OutfitsGallery({ outfits: initialOutfits }: Props) {
  const [outfits, setOutfits] = useState<Outfit[]>(initialOutfits);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredOutfits = useMemo(() => {
    if (showFavoritesOnly) {
      return outfits.filter((o) => o.is_favorite);
    }
    return outfits;
  }, [outfits, showFavoritesOnly]);

  const supabase = createClient();

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
    if (!confirm(`Delete "${outfit.name}"?`)) return;

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

      setOutfits((prev) => prev.filter((o) => o.id !== outfit.id));
      setOpen(false);
      setSelectedOutfit(null);
      toast.success("Outfit deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete outfit";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  async function toggleFavorite(outfit: Outfit) {
    const newValue = !outfit.is_favorite;

    // Optimistic update
    setOutfits((prev) =>
      prev.map((o) =>
        o.id === outfit.id ? { ...o, is_favorite: newValue } : o
      )
    );
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
      setOutfits((prev) =>
        prev.map((o) =>
          o.id === outfit.id ? { ...o, is_favorite: !newValue } : o
        )
      );
      toast.error("Failed to update favorite");
    }
  }

  if (outfits.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border py-16 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-secondary flex items-center justify-center">
          <Plus className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg mb-2">No outfits yet</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Create your first AI-generated outfit and it will appear here
        </p>
        <Link
          href="/outfits/generate"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border hover:bg-secondary transition-colors"
        >
          Create Your First Outfit
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter chips */}
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
          All
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
          Favorites
        </button>
      </div>

      {filteredOutfits.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOutfits.map((outfit) => (
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
                {new Date(outfit.created_at).toLocaleDateString("en-US", {
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
            No favorite outfits yet. Star some outfits to see them here!
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
              className="block sticky top-0 ml-auto mb-2 p-2 text-white/70 hover:text-white transition-colors z-10"
              aria-label="Close"
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
                  {new Date(selectedOutfit.created_at).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
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
                      ? "Remove from favorites"
                      : "Add to favorites"
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
                  aria-label="Delete outfit"
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
