import {
  Shirt,
  RectangleVertical,
  PersonStanding,
  Footprints,
  Watch,
  HardHat,
  type LucideIcon,
} from "lucide-react";

export type CategoryRoot = "Headwear" | "Top" | "Bottom" | "Full Body" | "Footwear" | "Accessories";

export interface RootConfig {
  key: string;
  dbValue: CategoryRoot;
  icon: LucideIcon;
}

// Single source of truth for category root configuration
// key = translation key (used with t(`categories.roots.${key}`))
// dbValue = value stored in database
export const ROOT_CONFIG: RootConfig[] = [
  { key: "headwear", dbValue: "Headwear", icon: HardHat },
  { key: "top", dbValue: "Top", icon: Shirt },
  { key: "bottom", dbValue: "Bottom", icon: RectangleVertical },
  { key: "fullBody", dbValue: "Full Body", icon: PersonStanding },
  { key: "footwear", dbValue: "Footwear", icon: Footprints },
  { key: "accessories", dbValue: "Accessories", icon: Watch },
];

// Helper to get icon by root value
export function getRootIcon(root: string): LucideIcon {
  return ROOT_CONFIG.find((r) => r.dbValue === root)?.icon || Shirt;
}

// Helper to get translation key by root value
export function getRootTranslationKey(root: string): string {
  return ROOT_CONFIG.find((r) => r.dbValue === root)?.key || "top";
}
