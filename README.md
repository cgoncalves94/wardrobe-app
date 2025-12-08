# Wardrobe App

AI-powered wardrobe manager built with **Next.js 15 + Tailwind + shadcn/ui + Supabase + Google Gemini**.

Catalog your clothes, organize by categories, generate outfit compositions, and virtually try on your wardrobe items.

## Features

### Core

- **Categories**: Organize items under 6 root types (Headwear, Top, Bottom, Full Body, Footwear, Accessories)
- **Items Gallery**: Upload photos, assign categories, mark favorites, filter and paginate

### AI Generation (Pro)

- **Outfit Generator**: Select wardrobe items and generate styled outfit compositions
  - Flat-lay or mannequin display modes
  - Gender selection for mannequin
- **AI Picks Mode**: Describe an outfit in text and let Gemini generate it
  - Style presets: casual, formal, date-night, work, street, cozy, elegant, sporty
- **Virtual Try-On**: Upload a selfie and overlay your wardrobe items
  - Preserves face, pose, and background
  - Works with individual items or complete outfits

### Organization

- **Outfit Folders**: Group generated outfits into custom folders
- **Favorites**: Mark items and outfits as favorites for quick access

### Subscription

- **Free Tier**: Browse wardrobe, manage categories and items
- **Pro Tier**: Access AI outfit generation and virtual try-on features

### Internationalization

- English and Portuguese language support via next-intl

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui + Radix UI |
| Auth | Supabase Auth |
| Database | Supabase (PostgreSQL with RLS) |
| Storage | Supabase Storage |
| AI | Google Gemini 2.5 Flash (image generation) |
| i18n | next-intl |

## Project Structure

```text
app/
├── (auth)/           # Login flow
├── (main)/           # Protected routes
│   ├── categories/   # Category management
│   ├── items/        # Wardrobe gallery
│   ├── outfits/      # Generated outfits, generation UI, try-on
│   └── upgrade/      # Pro subscription page
└── api/ai/           # AI generation endpoints

components/           # React components (galleries, forms, navigation)
lib/
├── categories.ts     # Category definitions (single source of truth)
├── features.ts       # Pro feature gating
├── supabase/         # Database clients
├── gemini/           # AI generation logic
└── images.ts         # Image processing utilities

messages/             # i18n translations (en.json, pt.json)
supabase/schema.sql   # Database schema with RLS policies
```

## Setup

### Prerequisites

- Node.js 18+
- pnpm 10+
- Supabase account
- Google AI Studio API key

### Installation

```bash
pnpm install
cp .env.local.example .env.local
# Fill in your environment variables
pnpm dev
```

### Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

## Supabase Setup

1. Create a new Supabase project
2. Run the SQL from `supabase/schema.sql` in the SQL Editor
3. The schema creates:
   - `categories` - Clothing categories with root types
   - `items` - Wardrobe items with images
   - `outfits` - Generated outfit/try-on images
   - `outfit_folders` - Folder organization for outfits
   - `user_subscriptions` - Subscription tier tracking
   - `wardrobe` storage bucket (public read)
   - RLS policies for user data isolation
   - Auto-create free subscription trigger for new users

## Development

```bash
pnpm dev       # Start development server (port 3000)
pnpm build     # Production build
pnpm start     # Start production server
pnpm lint      # Run ESLint
```

## Deploy

- **Frontend**: Vercel or any Next.js host
- **Backend**: Supabase (already hosted)

## License

MIT
