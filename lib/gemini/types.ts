// Client-safe types and constants for outfit generation

export type OutfitStyle =
  | "casual"
  | "formal"
  | "date-night"
  | "work"
  | "street"
  | "cozy"
  | "elegant"
  | "sporty";

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

export type MannequinGender = "female" | "male";

export const MANNEQUIN_GENDERS: { value: MannequinGender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];
