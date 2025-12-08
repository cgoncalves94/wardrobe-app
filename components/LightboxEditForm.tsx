"use client";

import { ReactNode } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  /** Current name value */
  name: string;
  /** Called when name changes */
  onNameChange: (name: string) => void;
  /** Placeholder for name input */
  namePlaceholder: string;
  /** Dropdown component slot (CategoryDropdown or FolderDropdown) */
  dropdown: ReactNode;
  /** Called when save is clicked */
  onSave: () => void;
  /** Called when cancel is clicked */
  onCancel: () => void;
  /** Whether save is in progress */
  saving: boolean;
  /** Whether save button should be disabled (besides saving state) */
  saveDisabled?: boolean;
};

/**
 * Shared edit form for lightbox overlays
 * Used by ItemsGallery and OutfitsGallery for inline editing
 */
export default function LightboxEditForm({
  name,
  onNameChange,
  namePlaceholder,
  dropdown,
  onSave,
  onCancel,
  saving,
  saveDisabled = false,
}: Props) {
  const t = useTranslations();

  return (
    <div className="space-y-3 overflow-visible">
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={namePlaceholder}
        className="w-full h-10 px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
        autoFocus
      />
      <div className="flex items-center justify-between gap-2 overflow-visible">
        {dropdown}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="p-2.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
            aria-label={t("common.cancel")}
          >
            <X className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || saveDisabled}
            className="p-2.5 rounded-lg bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-50"
            aria-label={t("common.save")}
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
