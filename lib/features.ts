import { Wand2, Shirt, type LucideIcon } from "lucide-react";

/**
 * Subscription tiers - single source of truth
 */
export type SubscriptionTier = "free" | "pro";

/**
 * Feature definition with all metadata
 */
export interface FeatureDefinition {
  isPro: boolean;
  route: string;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}

/**
 * All features - single source of truth
 *
 * To make a feature free: set isPro to false
 * To make a feature Pro-only: set isPro to true
 */
export const FEATURES: Record<string, FeatureDefinition> = {
  outfitGeneration: {
    isPro: true,
    route: "/outfits/generate",
    icon: Wand2,
    titleKey: "aiOutfits",
    descKey: "aiOutfitsDesc",
  },
  virtualTryOn: {
    isPro: true,
    route: "/outfits/try-on",
    icon: Shirt,
    titleKey: "virtualTryOn",
    descKey: "virtualTryOnDesc",
  },
};

export type FeatureKey = keyof typeof FEATURES;

/**
 * Get all Pro features (for upgrade page)
 */
export function getProFeatures(): FeatureDefinition[] {
  return Object.values(FEATURES).filter((f) => f.isPro);
}

/**
 * Check if a route requires Pro subscription
 */
export function isProRoute(href: string): boolean {
  const feature = Object.values(FEATURES).find((f) => f.route === href);
  return feature?.isPro ?? false;
}
