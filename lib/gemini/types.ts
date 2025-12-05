// Client-safe types and constants for outfit generation

export type OutfitStyle =
  | "casual"
  | "formal"
  | "date-night"
  | "work"
  | "street"
  | "cozy"
  | "elegant";

export const OUTFIT_STYLES: { value: OutfitStyle; label: string; emoji: string }[] = [
  { value: "casual", label: "Casual", emoji: "👕" },
  { value: "formal", label: "Formal", emoji: "👔" },
  { value: "date-night", label: "Date Night", emoji: "💕" },
  { value: "work", label: "Work", emoji: "💼" },
  { value: "street", label: "Street Style", emoji: "🔥" },
  { value: "cozy", label: "Cozy", emoji: "🧸" },
  { value: "elegant", label: "Elegant", emoji: "✨" },
];

export type MannequinGender = "female" | "male";

export const MANNEQUIN_GENDERS: { value: MannequinGender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];
