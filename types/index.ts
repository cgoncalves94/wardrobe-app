// Database types for Wardrobe app

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  root: 'Top' | 'Bottom' | 'Full Body' | 'Footwear' | 'Accessories';
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
