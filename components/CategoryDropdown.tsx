"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Check, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useClickOutside } from "@/hooks/use-click-outside";
import { ROOT_CONFIG, type CategoryRoot } from "@/lib/categories";

/** Category option for dropdown selection */
export type CategoryOption = {
  id: string;
  name: string;
  root: CategoryRoot;
};

type Props = {
  categories: CategoryOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  placeholder?: string;
  clearLabel?: string;
  showClearOption?: boolean;
  className?: string;
  /** Visual variant: default for filters, lightbox for dark backgrounds, form for full-width form fields */
  variant?: "default" | "lightbox" | "form";
  /** Show empty state when no categories */
  emptyState?: React.ReactNode;
};

/**
 * Dropdown for selecting a category, grouped by root type
 */
export default function CategoryDropdown({
  categories,
  selectedId,
  onSelect,
  placeholder,
  clearLabel,
  showClearOption = true,
  className = "",
  variant = "default",
  emptyState,
}: Props) {
  const isLightbox = variant === "lightbox";
  const isForm = variant === "form";
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations();

  const dropdownRef = useClickOutside<HTMLDivElement>(
    () => setIsOpen(false),
    isOpen
  );

  const categoriesByRoot = useMemo(() => {
    const grouped = new Map<string, CategoryOption[]>();
    for (const cat of categories) {
      const existing = grouped.get(cat.root) || [];
      grouped.set(cat.root, [...existing, cat]);
    }
    return grouped;
  }, [categories]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedId),
    [selectedId, categories]
  );

  const displayText = selectedCategory?.name || placeholder || t("items.filterByCategory");

  function handleSelect(id: string | null) {
    onSelect(id);
    setIsOpen(false);
  }

  // Get selected category's root icon for form variant
  const selectedRoot = selectedCategory
    ? ROOT_CONFIG.find(r => r.dbValue === selectedCategory.root)
    : null;

  if (categories.length === 0 && !emptyState) return null;

  return (
    <div className={`relative overflow-visible ${isForm ? "w-full" : ""} ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`rounded-lg text-sm font-medium transition-all inline-flex items-center gap-2 ${
          isForm
            ? "w-full h-11 px-4 pr-10 border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-left"
            : isLightbox
              ? "px-4 py-2 bg-white/10 border border-white/20 text-white hover:bg-white/20"
              : selectedId
                ? "px-4 py-2 bg-foreground text-background"
                : "px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80"
        }`}
      >
        {isLightbox && <Tag className="w-4 h-4" />}
        {isForm && selectedRoot && <selectedRoot.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
        <span className={isForm ? "truncate flex-1 text-left" : ""}>{displayText}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isForm ? "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" : ""} ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className={`absolute left-0 max-h-[40vh] overflow-y-auto overscroll-contain rounded-xl shadow-lg ${
          isForm
            ? "w-full mt-1 z-50 border border-border bg-background"
            : isLightbox
              ? "w-64 bottom-full mb-2 z-[100] bg-zinc-900/95 backdrop-blur-md border border-white/20"
              : "w-64 top-full mt-2 z-50 border border-border bg-card"
        }`}>
          {/* Empty state for form variant */}
          {categories.length === 0 && emptyState ? (
            <div className="p-2">{emptyState}</div>
          ) : (
            <>
              {/* Clear option */}
              {showClearOption && selectedId && !isForm && (
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

              {ROOT_CONFIG.map((rootConfig) => {
            const rootCategories = categoriesByRoot.get(rootConfig.dbValue);
            if (!rootCategories || rootCategories.length === 0) return null;

            const Icon = rootConfig.icon;
            return (
              <div key={rootConfig.key}>
                <div className={`px-4 py-2 text-xs font-medium uppercase tracking-wider flex items-center gap-2 ${
                  isLightbox
                    ? "text-white/50 bg-white/5"
                    : "text-muted-foreground bg-secondary/50"
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                  {t(`categories.roots.${rootConfig.key}`)}
                </div>
                {rootCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelect(cat.id)}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between ${
                      isLightbox
                        ? selectedId === cat.id
                          ? "bg-white text-black"
                          : "text-white hover:bg-white/10"
                        : selectedId === cat.id
                          ? "bg-foreground text-background"
                          : "hover:bg-secondary"
                    }`}
                  >
                    {cat.name}
                    {selectedId === cat.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            );
          })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
