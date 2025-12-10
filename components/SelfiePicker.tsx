"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Check, Plus, Trash2, X, RotateCcw, RotateCw, Loader2 } from "lucide-react";
import type { UserSelfie } from "@/types";

const MAX_SELFIES = 5;

type StagedImage = {
  file: File;
  previewUrl: string;
  rotation: number;
};

type Props = {
  selfies: UserSelfie[];
  selectedUrl: string | null;
  onSelect: (url: string | null) => void;
  onSelfiesChange: (selfies: UserSelfie[]) => void;
  userId: string;
};

async function rotateImageToBlob(file: File, degrees: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      const swap = degrees === 90 || degrees === 270;
      canvas.width = swap ? img.height : img.width;
      canvas.height = swap ? img.width : img.height;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create rotated image"));
        },
        file.type || "image/jpeg",
        0.92
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });
}

export default function SelfiePicker({ selfies, selectedUrl, onSelect, onSelfiesChange, userId }: Props) {
  const t = useTranslations("outfits.tryOn");
  const [staged, setStaged] = useState<StagedImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (staged?.previewUrl) {
      URL.revokeObjectURL(staged.previewUrl);
    }

    setStaged({
      file,
      previewUrl: URL.createObjectURL(file),
      rotation: 0,
    });
  };

  const rotate = async (direction: "left" | "right") => {
    if (!staged || rotating) return;
    setRotating(true);

    try {
      const newRotation = direction === "left"
        ? (staged.rotation - 90 + 360) % 360
        : (staged.rotation + 90) % 360;

      const blob = newRotation === 0
        ? staged.file
        : await rotateImageToBlob(staged.file, newRotation);

      const oldUrl = staged.previewUrl;
      const newUrl = URL.createObjectURL(blob);

      setStaged({
        ...staged,
        previewUrl: newUrl,
        rotation: newRotation,
      });

      URL.revokeObjectURL(oldUrl);
    } catch (err) {
      console.error("Rotation failed:", err);
    } finally {
      setRotating(false);
    }
  };

  const cancelStaging = () => {
    if (staged?.previewUrl) {
      URL.revokeObjectURL(staged.previewUrl);
    }
    setStaged(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const confirmUpload = async () => {
    if (!staged) return;
    setUploading(true);

    try {
      // Get the blob from preview URL (already rotated)
      const response = await fetch(staged.previewUrl);
      const blob = await response.blob();

      const ext = staged.file.name.split(".").pop() || "jpg";
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = `selfies/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("wardrobe")
        .upload(filePath, blob, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("wardrobe").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // Save to database
      const { data: newSelfie, error: dbError } = await supabase
        .from("user_selfies")
        .insert({
          user_id: userId,
          image_url: publicUrl,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Update local state
      const updatedSelfies = [newSelfie as UserSelfie, ...selfies].slice(0, MAX_SELFIES);
      onSelfiesChange(updatedSelfies);
      onSelect(publicUrl);

      // Clean up
      URL.revokeObjectURL(staged.previewUrl);
      setStaged(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const deleteSelfie = async (selfie: UserSelfie) => {
    setDeletingId(selfie.id);

    try {
      // Delete from database
      const { error } = await supabase
        .from("user_selfies")
        .delete()
        .eq("id", selfie.id);

      if (error) throw error;

      // Update local state
      const updatedSelfies = selfies.filter((s) => s.id !== selfie.id);
      onSelfiesChange(updatedSelfies);

      // Clear selection if deleted selfie was selected
      if (selectedUrl === selfie.image_url) {
        onSelect(updatedSelfies[0]?.image_url || null);
      }

      // Optionally delete from storage (extract path from URL)
      const urlParts = selfie.image_url.split("/wardrobe/");
      if (urlParts[1]) {
        await supabase.storage.from("wardrobe").remove([urlParts[1]]);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const updateLastUsed = async (selfieId: string) => {
    await supabase
      .from("user_selfies")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", selfieId);
  };

  const handleSelect = (selfie: UserSelfie) => {
    onSelect(selfie.image_url);
    updateLastUsed(selfie.id);
  };

  // Staging UI
  if (staged) {
    return (
      <div className="space-y-3">
        <div className="relative w-full max-w-[200px] aspect-[3/4] rounded-xl overflow-hidden border border-border">
          <Image
            src={staged.previewUrl}
            alt="Preview"
            fill
            className="object-cover"
            unoptimized
          />

          {/* Rotation controls */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => rotate("left")}
              disabled={rotating || uploading}
              aria-label="Rotate left"
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 text-white ${rotating ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => rotate("right")}
              disabled={rotating || uploading}
              aria-label="Rotate right"
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 text-white ${rotating ? "animate-spin" : ""}`} />
            </button>
            <div className="w-px h-4 bg-white/20 mx-0.5" />
            <button
              type="button"
              onClick={confirmUpload}
              disabled={rotating || uploading}
              aria-label="Confirm upload"
              className="p-1.5 rounded-full bg-white/20 hover:bg-green-500/80 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Check className="w-4 h-4 text-white" />
              )}
            </button>
          </div>

          {/* Cancel button */}
          <button
            type="button"
            onClick={cancelStaging}
            disabled={uploading}
            aria-label="Cancel"
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selfie strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {/* Saved selfies */}
        {selfies.map((selfie) => {
          const isSelected = selectedUrl === selfie.image_url;
          const isDeleting = deletingId === selfie.id;

          return (
            <div key={selfie.id} className="relative flex-shrink-0 group">
              <button
                type="button"
                onClick={() => handleSelect(selfie)}
                disabled={isDeleting}
                aria-label={`${t("savedPhoto")} ${isSelected ? "(selected)" : ""}`}
                className={`relative w-24 h-32 rounded-xl overflow-hidden border-2 transition-all ${
                  isSelected
                    ? "border-white ring-2 ring-white/30 scale-[1.02]"
                    : "border-transparent hover:border-white/50"
                } ${isDeleting ? "opacity-50" : ""}`}
              >
                <Image
                  src={selfie.image_url}
                  alt={t("savedPhoto")}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                      <Check className="w-5 h-5 text-black" />
                    </div>
                  </div>
                )}
              </button>

              {/* Delete button - shows on hover */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSelfie(selfie);
                }}
                disabled={isDeleting}
                aria-label="Delete photo"
                className="absolute -top-1 -right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                {isDeleting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </button>
            </div>
          );
        })}

        {/* Add new button */}
        {selfies.length < MAX_SELFIES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label={t("uploadNewPhoto")}
            className="flex-shrink-0 w-24 h-32 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 flex items-center justify-center transition-colors"
          >
            <Plus className="w-6 h-6 text-muted-foreground" />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          aria-label={t("uploadNewPhoto")}
          className="hidden"
        />
      </div>

      {/* Helper text */}
      {selfies.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {t("addPhotoHint")}
        </p>
      )}
    </div>
  );
}
