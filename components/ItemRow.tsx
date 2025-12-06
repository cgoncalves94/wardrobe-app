"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

export type BaseItem = {
  id: string;
  name: string;
  image_url: string | null;
};

interface ItemRowProps<T extends BaseItem> {
  title: string;
  items: T[];
  selected?: T | null;
  onSelect?: (item: T | null) => void;
  icon: React.ComponentType<{ className?: string }>;
  multiSelect?: boolean;
  selectedMulti?: T[];
  onMultiSelect?: (items: T[]) => void;
  disabled?: boolean;
}

export default function ItemRow<T extends BaseItem>({
  title,
  items,
  selected,
  onSelect,
  icon: Icon,
  multiSelect = false,
  selectedMulti = [],
  onMultiSelect,
  disabled = false,
}: ItemRowProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [items]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (el) {
      const scrollAmount = 200;
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Filter out items without images
const validItems = items.filter((item) => item.image_url);
if (validItems.length === 0) return null;

  const handleSelect = (item: T) => {
    if (multiSelect && onMultiSelect) {
      const isSelected = selectedMulti.some((i) => i.id === item.id);
      if (isSelected) {
        onMultiSelect(selectedMulti.filter((i) => i.id !== item.id));
      } else {
        onMultiSelect([...selectedMulti, item]);
      }
    } else if (onSelect) {
      onSelect(selected?.id === item.id ? null : item);
    }
  };

  const isItemSelected = (item: T) => {
    if (multiSelect) {
      return selectedMulti.some((i) => i.id === item.id);
    }
    return selected?.id === item.id;
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <span className="text-xs text-muted-foreground/50">{validItems.length}</span>
      </div>
      <div className="relative group">
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
        >
          {validItems.map((item) => {
            const isSelected = isItemSelected(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                disabled={disabled}
                className={`relative flex-shrink-0 w-[76px] h-[76px] sm:w-[88px] sm:h-[88px] lg:w-24 lg:h-24 rounded-xl overflow-hidden snap-start transition-all duration-200 ${
                  disabled
                    ? "opacity-50"
                    : isSelected
                    ? "ring-2 ring-white ring-offset-2 ring-offset-background scale-[1.02]"
                    : "hover:scale-[1.02] opacity-80 hover:opacity-100"
                }`}
              >
                <Image
                  src={item.image_url!}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 76px, (max-width: 1024px) 88px, 96px"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                      <Check className="w-4 h-4 text-black" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/90 border border-border shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-background"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {/* Right arrow */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/90 border border-border shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-background"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        {/* Scroll fade indicators */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
}
