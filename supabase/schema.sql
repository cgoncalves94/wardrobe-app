-- Wardrobe App - Initial Schema (run once)

-- 1. EXTENSIONS (needed for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. TABLES
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  root TEXT CHECK (root IN ('Headwear', 'Top', 'Bottom', 'Full Body', 'Footwear', 'Accessories')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outfit_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  generated_image_url TEXT NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  type TEXT DEFAULT 'outfit' CHECK (type IN ('outfit','tryon')),
  folder_id UUID REFERENCES outfit_folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ENABLE RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES (owner-scoped)
CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING ((SELECT auth.uid()) = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING ((SELECT auth.uid()) = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING ((SELECT auth.uid()) = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING ((SELECT auth.uid()) = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own items" ON items
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own items" ON items
  FOR UPDATE USING ((SELECT auth.uid()) = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own items" ON items
  FOR DELETE USING ((SELECT auth.uid()) = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage own folders" ON outfit_folders
  FOR ALL USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view own outfits" ON outfits
  FOR SELECT USING ((SELECT auth.uid()) = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own outfits" ON outfits
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own outfits" ON outfits
  FOR UPDATE USING ((SELECT auth.uid()) = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own outfits" ON outfits
  FOR DELETE USING ((SELECT auth.uid()) = user_id OR user_id IS NULL);

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_root ON categories(root);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_outfit_folders_user_id ON outfit_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_outfits_user_id ON outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_outfits_type ON outfits(type);
CREATE INDEX IF NOT EXISTS idx_outfits_folder_id ON outfits(folder_id);

-- 6. STORAGE BUCKET & POLICIES
INSERT INTO storage.buckets (id, name, public)
VALUES ('wardrobe', 'wardrobe', true)
ON CONFLICT (id) DO NOTHING;

-- Keep storage policies minimal and non-overlapping:
CREATE POLICY IF NOT EXISTS "Public can view wardrobe images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'wardrobe');

CREATE POLICY IF NOT EXISTS "Authenticated users can upload to wardrobe"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wardrobe');

CREATE POLICY IF NOT EXISTS "Authenticated users can update wardrobe"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'wardrobe');

CREATE POLICY IF NOT EXISTS "Authenticated users can delete from wardrobe"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'wardrobe');

-- 7. SUBSCRIPTIONS
CREATE TYPE subscription_tier AS ENUM ('free','pro');

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier subscription_tier DEFAULT 'free' NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id ON user_subscriptions(stripe_customer_id);

-- Trigger to update 'updated_at'
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Auto-create free subscription for new users
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, tier)
  VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_subscription();