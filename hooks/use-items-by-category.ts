import { useMemo } from "react";
import type { Item } from "@/types";

/**
 * Hook to filter wardrobe items by category root
 */
export function useItemsByCategory(items: Item[]) {
  return useMemo(
    () => ({
      headwear: items.filter((i) => i.categories?.root === "Headwear"),
      top: items.filter((i) => i.categories?.root === "Top"),
      outerwear: items.filter((i) => i.categories?.root === "Outerwear"),
      bottom: items.filter((i) => i.categories?.root === "Bottom"),
      fullBody: items.filter((i) => i.categories?.root === "Full Body"),
      footwear: items.filter((i) => i.categories?.root === "Footwear"),
      accessories: items.filter((i) => i.categories?.root === "Accessories"),
    }),
    [items]
  );
}
