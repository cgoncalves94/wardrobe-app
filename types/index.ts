// Database types for Wardrobe app

import type { CategoryRoot } from "@/lib/categories";

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  root: CategoryRoot;
  created_at?: string;
}

export interface Item {
  id: string;
  user_id: string | null;
  name: string;
  image_url: string | null;
  category_id: string | null;
  is_favorite: boolean;
  created_at?: string;
  categories?: { name: string; root?: string } | null;
}

export interface Outfit {
  id: string;
  user_id: string | null;
  name: string;
  generated_image_url: string;
  is_favorite: boolean;
  created_at: string;
  folder_id: string | null;
}

export interface OutfitFolder {
  id: string;
  user_id: string | null;
  name: string;
  created_at: string;
}

export interface UserSelfie {
  id: string;
  user_id: string;
  image_url: string;
  file_path: string;  // Storage path for reliable deletion
  last_used_at: string;
  created_at: string;
}

// Database row types (from Supabase queries)
export interface ItemRow {
  id: string;
  name: string;
  image_url: string | null;
  category_id: string | null;
  is_favorite: boolean;
  created_at: string;
  categories: { name: string }[] | { name: string } | null;
}

export interface CategoryRow {
  id: string;
  name: string;
  root: string;
}

// Error type for consistent error handling
export interface DbError {
  message: string;
  code?: string;
}
