/**
 * Reusable selection strip showing selected items/outfit thumbnails with clear action
 */
import Image from "next/image";
import { X } from "lucide-react";

interface SelectionItem {
  id: string;
  name: string;
  image_url: string;
}

interface SelectionStripProps {
  /** Label to display (e.g., "3 SELECTED", "1 OUTFIT") */
  label: string;
  /** Array of selected items to display as thumbnails */
  items: SelectionItem[];
  /** Callback when clear button is clicked */
  onClear: () => void;
  /** Aria label for the clear button */
  clearLabel: string;
}

export default function SelectionStrip({
  label,
  items,
  onClear,
  clearLabel,
}: SelectionStripProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 p-3 border-b border-foreground/[0.06] bg-background/30">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex-shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-2 overflow-x-auto flex-1 justify-end">
        {items.map((item) => (
          <div
            key={item.id}
            className="relative w-12 h-12 rounded-lg overflow-hidden ring-2 ring-foreground/20 flex-shrink-0"
          >
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={onClear}
          className="w-12 h-12 rounded-lg border border-border/40 flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          aria-label={clearLabel}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
