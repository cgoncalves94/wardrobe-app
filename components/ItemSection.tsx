"use client";

import Image from "next/image";
import { Check, ChevronDown, X, type LucideIcon } from "lucide-react";

type ItemSummary = {
  id: string;
  name: string;
  image_url: string | null;
};

type Labels = {
  itemsAvailable: (count: number) => string;
  noItemsInCategory: string;
  selectItem: (name: string) => string;
  clearSelection: string;
};

type ItemSectionProps<T extends ItemSummary> = {
  id: string;
  title: string;
  items: T[];
  selected: T | null;
  onSelect: (item: T | null) => void;
  icon: LucideIcon;
  expandedSection: string | null;
  onExpandedChange: (id: string | null) => void;
  labels: Labels;
};

export default function ItemSection<T extends ItemSummary>({
  id,
  title,
  items,
  selected,
  onSelect,
  icon: Icon,
  expandedSection,
  onExpandedChange,
  labels,
}: ItemSectionProps<T>) {
  const isExpanded = expandedSection === id;

  // When selected, show static header with clear button
  if (selected) {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 p-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0 relative">
            <Image
              src={selected.image_url!}
              alt={selected.name}
              fill
              className="object-cover"
              sizes="100px"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">{title}</div>
            <div className="text-xs text-muted-foreground">{selected.name}</div>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label={labels.clearSelection}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header - clickable when no selection */}
      <button
        type="button"
        onClick={() => onExpandedChange(isExpanded ? null : id)}
        className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors"
      >
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{labels.itemsAvailable(items.length)}</div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expandable grid */}
      {isExpanded && !selected && (
        <div className="border-t border-border p-3 bg-secondary/30">
          {items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              {labels.noItemsInCategory}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onExpandedChange(null);
                  }}
                  aria-label={labels.selectItem(item.name)}
                  className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-foreground/30 transition-all hover:scale-105"
                >
                  <Image
                    src={item.image_url!}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="150px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
