-- Wardrobe App - Database Schema
-- Run this in your Supabase SQL Editor (fresh project)

-- ============================================
-- 1. TABLES
-- ============================================

-- Categories table (clothing types)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  root TEXT CHECK (root IN ('Headwear', 'Top', 'Bottom', 'Full Body', 'Footwear', 'Accessories')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Items table (wardrobe items)
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Outfits table (AI-generated outfit compositions and virtual try-ons)
CREATE TABLE IF NOT EXISTS outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  generated_image_url TEXT NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  type TEXT DEFAULT 'outfit' CHECK (type IN ('outfit', 'tryon')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. ROW LEVEL SECURITY (Tables)
-- ============================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Items policies
CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own items" ON items
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own items" ON items
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own items" ON items
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Outfits policies
CREATE POLICY "Users can view own outfits" ON outfits
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own outfits" ON outfits
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own outfits" ON outfits
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own outfits" ON outfits
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_root ON categories(root);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_outfits_user_id ON outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_outfits_type ON outfits(type);

-- ============================================
-- 4. STORAGE BUCKET & POLICIES
-- ============================================

-- Create storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('wardrobe', 'wardrobe', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Allow public viewing
CREATE POLICY "Public can view wardrobe images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'wardrobe');

-- Storage policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload to wardrobe"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wardrobe');

-- Storage policy: Authenticated users can update their uploads
CREATE POLICY "Authenticated users can update wardrobe"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'wardrobe');

-- Storage policy: Authenticated users can delete
CREATE POLICY "Authenticated users can delete from wardrobe"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'wardrobe');

-- ============================================
-- 5. USER SUBSCRIPTIONS (Premium Tier System)
-- ============================================

-- Subscription tier enum
CREATE TYPE subscription_tier AS ENUM ('free', 'pro');

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier subscription_tier DEFAULT 'free' NOT NULL,
  stripe_customer_id TEXT,          -- For future Stripe integration
  stripe_subscription_id TEXT,       -- For future Stripe integration
  current_period_end TIMESTAMPTZ,    -- Subscription expiry (for future use)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own subscription
CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id ON user_subscriptions(stripe_customer_id);

-- Auto-update updated_at trigger
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

-- ============================================
-- BACKFILL EXISTING USERS (Run once manually)
-- ============================================
-- INSERT INTO user_subscriptions (user_id, tier)
-- SELECT id, 'free' FROM auth.users
-- WHERE id NOT IN (SELECT user_id FROM user_subscriptions);
