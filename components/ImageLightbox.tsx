"use client";

import Image from "next/image";
import { X } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
  closeLabel: string;
}

export default function ImageLightbox({
  src,
  alt,
  open,
  onClose,
  closeLabel,
}: ImageLightboxProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
        aria-label={closeLabel}
      >
        <X className="w-6 h-6" />
      </button>
      <div
        className="relative w-full h-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain"
          sizes="100vw"
          priority
        />
      </div>
    </div>
  );
}
