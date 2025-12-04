# Wardrobe App

AI-powered wardrobe manager built with **Next.js 15 + Tailwind + shadcn/ui + Supabase + Google Gemini**.

Catalog your clothes, organize by categories, and generate outfit compositions with AI.

## Features

- **Categories**: Organize items under 5 root types (Top, Bottom, Full Body, Footwear, Accessories)
- **Items**: Upload photos, assign categories, mark favorites
- **AI Outfit Generator**: Select items and generate styled outfit compositions using Gemini
- **Mannequin Mode**: Optional human mannequin display for outfits
- **Dark UI**: Modern, responsive design

## Tech Stack

- Next.js 15 (App Router)
- Supabase (Auth, Database, Storage)
- Google Gemini AI (image generation)
- Tailwind CSS + shadcn/ui
- TypeScript

## Setup

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
   - `categories` table with RLS
   - `items` table with RLS
   - `outfits` table with RLS
   - `wardrobe` storage bucket (public)

## Deploy

- **Frontend**: Vercel or any Next.js host
- **Backend**: Supabase (already hosted)

## License

MIT
