"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, FolderOpen, Folder, Plus, Pencil, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useClickOutside } from "@/hooks/use-click-outside";

export type FolderOption = {
  id: string;
  name: string;
};

type Props = {
  folders: FolderOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  placeholder?: string;
  clearLabel?: string;
  showClearOption?: boolean;
  className?: string;
  /** Visual variant: default for filters, lightbox for dark backgrounds */
  variant?: "default" | "lightbox";
  /** Compact mode: icon only on mobile */
  compact?: boolean;
  /** Show "New Folder" option at end of list */
  showNewFolder?: boolean;
  /** Called when "New Folder" is clicked */
  onNewFolder?: () => void;
  /** Called when a folder is renamed */
  onRename?: (id: string, newName: string) => void;
  /** Called when a folder is deleted */
  onDelete?: (id: string) => void;
};

/**
 * Dropdown for selecting an outfit folder
 */
export default function FolderDropdown({
  folders,
  selectedId,
  onSelect,
  placeholder,
  clearLabel,
  showClearOption = true,
  className = "",
  variant = "default",
  compact = false,
  showNewFolder = false,
  onNewFolder,
  onRename,
  onDelete,
}: Props) {
  const isLightbox = variant === "lightbox";
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations();

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  function startEditing(folder: FolderOption, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(folder.id);
    setEditName(folder.name);
    setDeletingId(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName("");
  }

  function saveEdit() {
    if (editingId && editName.trim() && onRename) {
      onRename(editingId, editName.trim());
    }
    cancelEditing();
  }

  function confirmDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingId(id);
    setEditingId(null);
  }

  function executeDelete() {
    if (deletingId && onDelete) {
      onDelete(deletingId);
      // Clear selection if deleting the selected folder
      if (selectedId === deletingId) {
        onSelect(null);
      }
    }
    setDeletingId(null);
  }

  const dropdownRef = useClickOutside<HTMLDivElement>(
    () => setIsOpen(false),
    isOpen
  );

  const selectedFolder = folders.find((f) => f.id === selectedId);
  const displayText = selectedFolder?.name || placeholder || t("folders.allFolders");

  function handleSelect(id: string | null) {
    onSelect(id);
    setIsOpen(false);
  }

  if (folders.length === 0 && !showNewFolder) return null;

  return (
    <div className={`relative flex-shrink-0 ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`rounded-lg text-sm font-medium transition-all inline-flex items-center gap-2 whitespace-nowrap ${
          isLightbox
            ? "px-4 py-2 bg-white/10 border border-white/20 text-white hover:bg-white/20"
            : selectedId
              ? `${compact ? "p-2 sm:px-4 sm:py-2" : "px-4 py-2"} bg-foreground text-background`
              : `${compact ? "p-2 sm:px-4 sm:py-2" : "px-4 py-2"} bg-secondary text-foreground hover:bg-secondary/80`
        }`}
      >
        {isLightbox ? (
          <FolderOpen className="w-4 h-4" />
        ) : (
          <Folder className="w-4 h-4" />
        )}
        <span className={compact ? "hidden sm:inline" : ""}>{displayText}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""} ${compact ? "hidden sm:block" : ""}`}
        />
      </button>

      {isOpen && (
        <div className={`absolute max-h-[40vh] overflow-y-auto overscroll-contain rounded-xl shadow-lg ${
          isLightbox
            ? "left-0 w-64 bottom-full mb-2 z-[100] bg-zinc-900/95 backdrop-blur-md border border-white/20"
            : compact
              ? "right-0 sm:left-0 sm:right-auto w-56 sm:w-64 bottom-full mb-2 sm:bottom-auto sm:mb-0 sm:top-full sm:mt-2 z-50 border border-border bg-card"
              : "left-0 w-64 top-full mt-2 z-50 border border-border bg-card"
        }`}>
          {/* Clear option */}
          {showClearOption && selectedId && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors border-b ${
                isLightbox
                  ? "text-white/60 hover:bg-white/10 border-white/10"
                  : "text-muted-foreground hover:bg-secondary border-border"
              }`}
            >
              {clearLabel || t("common.clearFilter")}
            </button>
          )}

          {/* Folder list */}
          {folders.map((folder) => {
            const isEditing = editingId === folder.id;
            const isDeleting = deletingId === folder.id;
            const isSelected = selectedId === folder.id;
            const canEdit = onRename || onDelete;

            // Delete confirmation state
            if (isDeleting) {
              return (
                <div
                  key={folder.id}
                  className={`px-4 py-2.5 text-sm ${
                    isLightbox ? "bg-red-500/20" : "bg-destructive/10"
                  }`}
                >
                  <p className={`mb-2 ${isLightbox ? "text-white" : ""}`}>
                    {t("folders.deleteConfirm", { name: folder.name })}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={executeDelete}
                      className="px-3 py-1 text-xs rounded bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("common.delete")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      className={`px-3 py-1 text-xs rounded ${
                        isLightbox ? "bg-white/20 text-white" : "bg-secondary"
                      }`}
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              );
            }

            // Editing state
            if (isEditing) {
              return (
                <div key={folder.id} className="px-4 py-2 flex items-center gap-2">
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") cancelEditing();
                    }}
                    placeholder={t("folders.namePlaceholder")}
                    aria-label={t("folders.namePlaceholder")}
                    className={`flex-1 px-2 py-1 text-sm rounded border ${
                      isLightbox
                        ? "bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        : "bg-background border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={saveEdit}
                    title={t("common.save")}
                    className={`p-1 rounded ${
                      isLightbox ? "hover:bg-white/20 text-white" : "hover:bg-secondary"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    title={t("common.cancel")}
                    className={`p-1 rounded ${
                      isLightbox ? "hover:bg-white/20 text-white" : "hover:bg-secondary"
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            }

            // Normal state
            return (
              <div
                key={folder.id}
                className={`group flex items-center justify-between transition-colors ${
                  isLightbox
                    ? isSelected
                      ? "bg-white text-black"
                      : "text-white hover:bg-white/10"
                    : isSelected
                      ? "bg-foreground text-background"
                      : "hover:bg-secondary"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(folder.id)}
                  className="flex-1 px-4 py-2.5 text-left text-sm flex items-center gap-2"
                >
                  <Folder className="w-4 h-4" />
                  {folder.name}
                </button>
                <div className="flex items-center gap-0.5 pr-2">
                  {isSelected && !canEdit && <Check className="w-4 h-4" />}
                  {canEdit && (
                    <>
                      {onRename && (
                        <button
                          type="button"
                          onClick={(e) => startEditing(folder, e)}
                          className={`p-1.5 rounded sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ${
                            isLightbox
                              ? isSelected ? "hover:bg-black/20" : "hover:bg-white/20"
                              : isSelected ? "hover:bg-background/20" : "hover:bg-secondary"
                          }`}
                          title={t("common.rename")}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={(e) => confirmDelete(folder.id, e)}
                          className={`p-1.5 rounded sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ${
                            isLightbox
                              ? isSelected ? "hover:bg-black/20" : "hover:bg-white/20"
                              : isSelected ? "hover:bg-background/20" : "hover:bg-secondary"
                          }`}
                          title={t("common.delete")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* New Folder option */}
          {showNewFolder && onNewFolder && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNewFolder();
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 border-t ${
                isLightbox
                  ? "text-white/80 hover:bg-white/10 border-white/10"
                  : "text-muted-foreground hover:bg-secondary border-border"
              }`}
            >
              <Plus className="w-4 h-4" />
              {t("folders.newFolder")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
