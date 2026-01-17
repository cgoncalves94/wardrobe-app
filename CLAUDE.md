# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
pnpm dev       # Start development server (port 3000)
pnpm build     # Production build
pnpm start     # Start production server
pnpm lint      # Run ESLint
```

Package manager: **pnpm 10.14.0**

## Tech Stack

- **Framework:** Next.js 15 (App Router) with TypeScript
- **UI:** shadcn/ui + Radix UI + Tailwind CSS
- **Backend:** Supabase (auth, database with RLS, storage)
- **AI:** Google Gemini 3 Pro Image (Nano Banana Pro)
- **i18n:** next-intl (English, Portuguese)

## Architecture Overview

### Routing Structure

- `/app/(auth)/` - Login flow with language switcher
- `/app/(main)/` - Protected app routes (home, categories, items, outfits)
- `/app/api/ai/` - AI generation endpoints (generate-outfit, generate-try-on)

### Key Patterns

**Single Sources of Truth:**

- `lib/categories.ts` - Category root types with icons and translation keys
- `lib/features.ts` - Pro feature definitions and gating logic

**Subscription Gating:**

- `isProRoute(href)` checks if route requires Pro subscription
- `ProFeatureGate` wrapper blocks access for free users
- `ProBadge` overlay indicates locked features

**Image Handling:**

- Client uploads to `wardrobe/{folder}/{filename}` in Supabase Storage
- Client-side compression via `lib/images.client.ts` before upload
- Server converts to base64 via `fetchImageAsBase64()` for Gemini API
- Display via Supabase public URLs

**Selfie Management:**

- Users can store multiple selfies for virtual try-on
- `SelfiePicker` component handles selection and upload
- Selfies are reordered by `last_used_at` to prioritize recent ones

**Data Fetching:**

- Server components use Supabase directly
- `revalidate: 0` for real-time data on gallery pages

### Database Tables (Supabase)

- `categories` - User categories with root type (Headwear, Top, Outerwear, Bottom, Full Body, Footwear, Accessories)
- `items` - Wardrobe items with image_url, category_id, is_favorite
- `outfit_folders` - Folder organization for outfits
- `outfits` - Generated images with type (outfit | tryon), optional folder_id
- `user_selfies` - Stored selfies for virtual try-on (image_url, file_path, last_used_at)
- `user_subscriptions` - Subscription tier (free | pro)

All tables have RLS policies for user data isolation.

### AI Generation (Gemini)

- Uses narrative photographer-style prompts per Google best practices
- Two modes: compose from selected items OR pure text-to-image
- Virtual try-on preserves user pose/face/background
- Requires confirmed selfie selection before generating try-on
- Implements exponential backoff retry for rate limits
- Supports `priorityFirstItem` for outfit generation ordering

### Internationalization

- Server: `getTranslations("namespace")`
- Client: `useTranslations("namespace")`
- Messages in `/messages/en.json` and `/messages/pt.json`
- Namespace pattern: home, nav, common, pro, auth, categories, items, outfits

## Environment Variables

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GEMINI_API_KEY
```
