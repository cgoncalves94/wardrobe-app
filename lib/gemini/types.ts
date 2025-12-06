/**
 * Client-safe types and constants for outfit generation
 */

/** Available outfit style options for AI generation */
export type OutfitStyle =
  | "casual"
  | "formal"
  | "date-night"
  | "work"
  | "street"
  | "cozy"
  | "elegant"
  | "sporty";

/** Outfit style options with display labels */
export const OUTFIT_STYLES: { value: OutfitStyle; label: string }[] = [
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
  { value: "date-night", label: "Date Night" },
  { value: "work", label: "Work" },
  { value: "street", label: "Street Style" },
  { value: "cozy", label: "Cozy" },
  { value: "elegant", label: "Elegant" },
  { value: "sporty", label: "Sporty" },
];

/** Gender options for mannequin display mode */
export type MannequinGender = "female" | "male";

/** Mannequin gender options with display labels */
export const MANNEQUIN_GENDERS: { value: MannequinGender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];
