"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
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
}: Props) {
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

  if (categories.length === 0) return null;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-2 ${
          selectedId
            ? "bg-foreground text-background"
            : "bg-secondary text-foreground hover:bg-secondary/80"
        }`}
      >
        {displayText}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 w-64 max-h-[60vh] sm:max-h-80 overflow-y-auto rounded-xl border border-border bg-card shadow-lg z-50">
          {/* Clear option */}
          {showClearOption && selectedId && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-secondary transition-colors border-b border-border"
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
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-secondary/50 flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" />
                  {t(`categories.roots.${rootConfig.key}`)}
                </div>
                {rootCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelect(cat.id)}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between ${
                      selectedId === cat.id
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
        </div>
      )}
    </div>
  );
}
