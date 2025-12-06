"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Upload, ImageIcon, AlertCircle, RefreshCw } from "lucide-react";

type Props = {
  bucket: string;
  folder?: string;
  onUploaded: (path: string, publicUrl: string) => void;
  imageUrl?: string;
  /** Show full image without cropping (useful for full-body photos) */
  preserveAspect?: boolean;
};

/**
 * Drag-and-drop image uploader with Supabase storage integration
 */
export default function ImageUploader({ bucket, folder, onUploaded, imageUrl, preserveAspect = false }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleFile(file: File) {
    try {
      setUploading(true);
      setError(null);

      const ext = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
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
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFile(file);
    }
  }

  if (imageUrl && !uploading && !error) {
    return (
      <div
        className={`relative rounded-xl overflow-hidden border border-border cursor-pointer group ${
          preserveAspect ? "w-fit max-h-[320px]" : "aspect-square max-w-[280px]"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <Image
          src={imageUrl}
          alt="Preview"
          {...(preserveAspect
            ? { width: 280, height: 320, className: "object-contain max-h-[320px] w-auto" }
            : { fill: true, className: "object-cover", sizes: "280px" }
          )}
        />
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
