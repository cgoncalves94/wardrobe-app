"use client";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, ImageIcon, CheckCircle, AlertCircle } from "lucide-react";

type Props = {
  bucket: string;
  onUploaded: (path: string, publicUrl: string) => void;
};

export default function ImageUploader({ bucket, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleFile(file: File) {
    try {
      setUploading(true);
      setUploaded(false);
      setError(null);

      const ext = file.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      onUploaded(filePath, data.publicUrl);
      setUploaded(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      setUploaded(false);
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

  return (
    <div className="grid gap-2">
      <Label>Upload image</Label>
      <div
        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 sm:p-6 transition-all cursor-pointer
          ${dragActive ? "border-foreground/50 bg-secondary" : "border-border hover:border-foreground/30"}
          ${uploaded ? "border-green-500 bg-green-50 dark:bg-green-950/20" : ""}
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
            <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">Uploading...</p>
          </>
        ) : error ? (
          <>
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
            <p className="text-xs text-muted-foreground">Click to try again</p>
          </>
        ) : uploaded ? (
          <>
            <CheckCircle className="w-8 h-8 text-green-500" />
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Uploaded!</p>
            <p className="text-xs text-muted-foreground">Click or drop to replace</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              {dragActive ? (
                <ImageIcon className="w-6 h-6 text-foreground/70" />
              ) : (
                <Upload className="w-6 h-6 text-foreground/70" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 10MB</p>
          </>
        )}
      </div>
    </div>
  );
}
