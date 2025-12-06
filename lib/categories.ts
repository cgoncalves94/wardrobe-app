import {
  Shirt,
  RectangleVertical,
  PersonStanding,
  Footprints,
  Watch,
  HardHat,
  type LucideIcon,
} from "lucide-react";

/** Category root types matching database values */
export type CategoryRoot = "Headwear" | "Top" | "Bottom" | "Full Body" | "Footwear" | "Accessories";

/** Configuration for a category root with translation key and icon */
export interface RootConfig {
  key: string;
  dbValue: CategoryRoot;
  icon: LucideIcon;
}

/**
 * Single source of truth for category root configuration
 * key = translation key, dbValue = database value
 */
export const ROOT_CONFIG: RootConfig[] = [
  { key: "headwear", dbValue: "Headwear", icon: HardHat },
  { key: "top", dbValue: "Top", icon: Shirt },
  { key: "bottom", dbValue: "Bottom", icon: RectangleVertical },
  { key: "fullBody", dbValue: "Full Body", icon: PersonStanding },
  { key: "footwear", dbValue: "Footwear", icon: Footprints },
  { key: "accessories", dbValue: "Accessories", icon: Watch },
];

/**
 * Get the icon component for a category root
 */
export function getRootIcon(root: string): LucideIcon {
  const config = ROOT_CONFIG.find((r) => r.dbValue === root);
  if (!config && process.env.NODE_ENV === "development") {
    console.warn(`[Category] No icon found for category root: "${root}"`);
  }
  return config?.icon || Shirt;
}

/**
 * Get the translation key for a category root
 */
export function getRootTranslationKey(root: string): string {
  const config = ROOT_CONFIG.find((r) => r.dbValue === root);
  if (!config && process.env.NODE_ENV === "development") {
    console.warn(`[Category] No translation key found for category root: "${root}"`);
  }
  return config?.key || "top";
}
