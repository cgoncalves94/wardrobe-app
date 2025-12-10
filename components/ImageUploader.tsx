"use client";
import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Upload, ImageIcon, AlertCircle, RefreshCw, RotateCcw, RotateCw, Check, X } from "lucide-react";

type Props = {
  bucket: string;
  folder?: string;
  onUploaded: (path: string, publicUrl: string) => void;
  imageUrl?: string;
  /** Show full image without cropping (useful for full-body photos) */
  preserveAspect?: boolean;
};

type StagedImage = {
  originalFile: File;
  previewUrl: string;
  rotation: number; // 0, 90, 180, 270
};

/**
 * Drag-and-drop image uploader with rotation support and Supabase storage integration
 */
export default function ImageUploader({ bucket, folder, onUploaded, imageUrl, preserveAspect = false }: Props) {
  const t = useTranslations("common");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staged, setStaged] = useState<StagedImage | null>(null);
  const [rotating, setRotating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Canvas-based image rotation - returns a blob URL
  async function rotateImageToBlob(file: File, degrees: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Swap dimensions for 90/270 degree rotations
        const swap = degrees === 90 || degrees === 270;
        canvas.width = swap ? img.height : img.width;
        canvas.height = swap ? img.width : img.height;

        // Move to center, rotate, draw, move back
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(URL.createObjectURL(blob));
            } else {
              reject(new Error("Failed to create rotated image"));
            }
          },
          file.type || "image/jpeg",
          0.92
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  }

  // Stage image for preview (no upload yet)
  function stageFile(file: File) {
    // Clean up previous preview URL
    if (staged?.previewUrl) {
      URL.revokeObjectURL(staged.previewUrl);
    }
    setError(null);
    setStaged({
      originalFile: file,
      previewUrl: URL.createObjectURL(file),
      rotation: 0,
    });
  }

  // Rotate staged image - actually rotates the preview
  const rotate = useCallback(async (direction: "left" | "right") => {
    if (!staged || rotating) return;

    setRotating(true);
    try {
      const newRotation = direction === "left"
        ? (staged.rotation - 90 + 360) % 360
        : (staged.rotation + 90) % 360;

      // Clean up old preview
      URL.revokeObjectURL(staged.previewUrl);

      // Create new rotated preview from original file
      const newPreviewUrl = newRotation === 0
        ? URL.createObjectURL(staged.originalFile)
        : await rotateImageToBlob(staged.originalFile, newRotation);

      setStaged({
        ...staged,
        previewUrl: newPreviewUrl,
        rotation: newRotation,
      });
    } catch (err) {
      console.error("Rotation failed:", err);
    } finally {
      setRotating(false);
    }
  }, [staged, rotating]);

  // Cancel staging
  const cancelStaging = useCallback(() => {
    if (staged?.previewUrl) {
      URL.revokeObjectURL(staged.previewUrl);
    }
    setStaged(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [staged]);

  // Upload the staged image (with rotation already applied in preview)
  async function confirmUpload() {
    if (!staged) return;

    try {
      setUploading(true);
      setError(null);

      // Fetch the rotated blob from the preview URL
      const response = await fetch(staged.previewUrl);
      const blob = await response.blob();

      const ext = staged.originalFile.name.split(".").pop() || "jpg";
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

      // Clean up and reset
      URL.revokeObjectURL(staged.previewUrl);
      setStaged(null);
      onUploaded(filePath, data.publicUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) stageFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      stageFile(file);
    }
  }

  // Uploading staged image
  if (staged && uploading) {
    return (
      <div className="flex flex-col gap-3 max-w-[280px]">
        <div
          className={`relative rounded-xl overflow-hidden border border-border ${
            preserveAspect ? "" : "aspect-square"
          } flex items-center justify-center bg-muted`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">{t("uploading")}</p>
          </div>
        </div>
      </div>
    );
  }

  // Staging UI - show preview with elegant overlay rotation controls
  if (staged) {
    return (
      <div className="flex flex-col gap-3 max-w-[280px]">
        <div
          className={`relative rounded-xl overflow-hidden border border-border group ${
            preserveAspect ? "" : "aspect-square"
          }`}
        >
          {/* Preview shows the actual rotated image - no CSS transform needed */}
          <Image
            src={staged.previewUrl}
            alt="Preview"
            width={280}
            height={preserveAspect ? 373 : 280}
            unoptimized
            className={`w-full ${preserveAspect ? "h-auto" : "h-full object-cover"}`}
          />

          {/* Overlay controls - elegant glass morphism toolbar */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 shadow-lg">
            <button
              type="button"
              onClick={() => rotate("left")}
              disabled={rotating}
              className="p-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors disabled:opacity-50"
              title={t("rotateLeft")}
            >
              <RotateCcw className={`w-4 h-4 text-white ${rotating ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => rotate("right")}
              disabled={rotating}
              className="p-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors disabled:opacity-50"
              title={t("rotateRight")}
            >
              <RotateCw className={`w-4 h-4 text-white ${rotating ? "animate-spin" : ""}`} />
            </button>
            <div className="w-px h-4 bg-white/20 mx-0.5" />
            <button
              type="button"
              onClick={confirmUpload}
              disabled={rotating}
              className="p-2 rounded-full bg-white/20 hover:bg-green-500/80 active:bg-green-600/80 transition-colors disabled:opacity-50"
              title={t("confirm")}
            >
              <Check className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Clear button - top right */}
          <button
            type="button"
            onClick={cancelStaging}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors border border-white/10"
            title={t("cancel")}
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    );
  }

  if (imageUrl && !uploading && !error) {
    return (
      <div
        className={`relative rounded-xl overflow-hidden border border-border cursor-pointer group ${
          preserveAspect ? "max-w-[280px]" : "aspect-square max-w-[280px]"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        {preserveAspect ? (
          <Image
            src={imageUrl}
            alt="Preview"
            width={3}
            height={4}
            className="object-contain"
            style={{ width: "100%", height: "auto" }}
            sizes="(max-width: 640px) 80vw, 280px"
          />
        ) : (
          <Image
            src={imageUrl}
            alt="Preview"
            fill
            className="object-cover"
            sizes="280px"
          />
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-8 h-8 text-white" />
          <p className="text-sm text-white font-medium">Click to replace</p>
        </div>
        <Input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          disabled={uploading}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 sm:p-8 transition-all cursor-pointer
        ${dragActive ? "border-foreground/50 bg-secondary" : "border-border hover:border-foreground/30"}
        ${error ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <Input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={uploading}
        className="hidden"
      />

      {uploading ? (
        <>
          <div className="w-10 h-10 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Uploading...</p>
        </>
      ) : error ? (
        <>
          <AlertCircle className="w-10 h-10 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
          <p className="text-xs text-muted-foreground">Click to try again</p>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
            {dragActive ? (
              <ImageIcon className="w-7 h-7 text-foreground/70" />
            ) : (
              <Upload className="w-7 h-7 text-foreground/70" />
            )}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            <span className="font-medium text-foreground">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 10MB</p>
        </>
      )}
    </div>
  );
}
