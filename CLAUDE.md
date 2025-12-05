# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server on port 3000
pnpm build        # Production build
pnpm lint         # ESLint check
```

## Architecture Overview

This is a Next.js 15 (App Router) wardrobe management app with AI-powered outfit generation using Google Gemini.

### Route Groups

- `app/(auth)/` - Public authentication pages (login). Uses minimal layout.
- `app/(main)/` - Protected app pages with shared header/footer layout. All routes here require auth.
- `app/api/ai/` - AI generation endpoints (authenticated via Supabase session check)

### Supabase Integration

**Client creation patterns** (important - use the right one):

- Server Components/Route Handlers: `import { createClient } from "@/lib/supabase/server"`
- Client Components: `import { createClient } from "@/lib/supabase/client"`

The server client is async (`await createClient()`), the browser client is sync.

**Database schema** (see `supabase/schema.sql`):

- `categories` - Clothing types with root enum: Headwear, Top, Bottom, Full Body, Footwear, Accessories (see `lib/categories.ts` for shared config)
- `items` - Wardrobe items with image URLs (stored in `wardrobe` bucket), category references
- `outfits` - AI-generated outfit compositions

All tables have RLS policies scoped to `auth.uid()`.

### AI Image Generation

`lib/gemini.ts` wraps the `@google/genai` SDK:

- `generateOutfitImage()` - Combines clothing items into styled flat-lay or mannequin photos
- `generateTryOnImage()` - Virtual try-on (puts outfit on user photo)
- Uses `gemini-2.5-flash-image` model with TEXT+IMAGE response modalities
- Has built-in retry logic for 429 rate limits with exponential backoff

**Note**: This module is server-only due to API key access. Types are exported from `lib/gemini-types.ts` for client use.

### Middleware Auth Flow

`middleware.ts` handles session refresh and route protection:

- Public routes: `/login`, `/auth/callback`
- All other routes redirect to `/login` if unauthenticated
- API routes excluded from middleware (handle their own auth)

### UI Components

- `components/ui/` - shadcn/ui primitives (Button, Card, Input, etc.)
- `components/` - App-specific components (ImageUploader, ItemsGallery, OutfitsGallery)

### Internationalization (i18n)

Uses `next-intl` with cookie-based locale detection (no URL prefixes like `/en/` or `/pt/`).

**Configuration files:**

- `i18n/config.ts` - Locale definitions (en, pt) with flags and display codes
- `i18n/request.ts` - Server request configuration for next-intl
- `messages/en.json` - English translations
- `messages/pt.json` - Portuguese translations

**Usage patterns:**

- Server Components: `const t = await getTranslations()` from `next-intl/server`
- Client Components: `const t = useTranslations()` from `next-intl`

**Language switcher components:**

- `LanguageSwitcher.tsx` - For main app layout (receives currentLocale as prop)
- `LoginLanguageSwitcher.tsx` - For login page (reads locale from cookie)

Locale is stored in `NEXT_LOCALE` cookie and persists across sessions.

### Path Aliases

`@/*` maps to project root (configured in `tsconfig.json`).
