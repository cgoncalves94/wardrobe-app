<div align="center">

# ✨ Wardrobe

**Your AI-powered personal wardrobe assistant**

Catalog your clothes, generate outfit compositions, and virtually try on your wardrobe items — all powered by Google Gemini.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Deployment](#-deployment)

</div>

---

## 🎯 Features

### 📸 Wardrobe Management

- **Smart Categories** — Organize items by type: Headwear, Tops, Bottoms, Full Body, Footwear, Accessories
- **Image Gallery** — Upload photos, mark favorites, filter and browse with pagination
- **Quick Search** — Find items instantly across your entire wardrobe

### 🤖 AI-Powered Generation *(Pro)*

- **Outfit Composer** — Select items and generate styled outfit compositions
  - Flat-lay or mannequin display modes
  - Gender-specific mannequin styling
- **AI Picks** — Describe your desired look and let AI create it
  - Style presets: casual, formal, date-night, street, cozy, elegant, sporty
- **Virtual Try-On** — See how clothes look on you
  - Upload a selfie, overlay any wardrobe item
  - Preserves your face, pose, and background

### 📁 Organization

- **Smart Folders** — Group outfits into custom collections
- **Favorites** — Quick access to your best items and looks

### 🌍 Internationalization

- English and Portuguese language support

---

## 🛠 Tech Stack

<table>
<tr>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=nextjs" width="48" height="48" alt="Next.js" />
<br>Next.js 15
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=ts" width="48" height="48" alt="TypeScript" />
<br>TypeScript
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=tailwind" width="48" height="48" alt="Tailwind" />
<br>Tailwind
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=supabase" width="48" height="48" alt="Supabase" />
<br>Supabase
</td>
<td align="center" width="96">
<img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" width="48" height="48" alt="Gemini" />
<br>Gemini AI
</td>
</tr>
</table>

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Styling** | Tailwind CSS + shadcn/ui + Radix UI |
| **Auth & DB** | Supabase (PostgreSQL with RLS) |
| **Storage** | Supabase Storage |
| **AI** | Google Gemini 3 Pro Image (Nano Banana Pro) |
| **i18n** | next-intl |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10+
- [Supabase](https://supabase.com) account
- [Google AI Studio](https://aistudio.google.com) API key

### Quick Start

```bash
# Clone and install
git clone https://github.com/cgoncalves94/wardrobe-app.git
cd wardrobe-app
pnpm install

# Configure environment
cp .env.local.example .env.local
```

Add your credentials to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

```bash
# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Database Setup

1. Create a new [Supabase project](https://app.supabase.com)
2. Run the SQL from `supabase/schema.sql` in the SQL Editor
3. This creates all tables, storage buckets, and RLS policies

<details>
<summary>📋 Database Schema</summary>

| Table | Purpose |
|-------|---------|
| `categories` | Clothing categories with root types |
| `items` | Wardrobe items with images |
| `outfits` | Generated outfit/try-on images |
| `outfit_folders` | Folder organization |
| `user_selfies` | Stored selfies for try-on |
| `user_subscriptions` | Subscription tier tracking |

All tables have RLS policies for user data isolation.

</details>

---

## 📁 Project Structure

```
app/
├── (auth)/           # Login flow
├── (main)/           # Protected routes
│   ├── categories/   # Category management
│   ├── items/        # Wardrobe gallery
│   ├── outfits/      # Generation & try-on
│   └── upgrade/      # Pro subscription
└── api/ai/           # AI endpoints

components/           # UI components
lib/
├── categories.ts     # Category definitions
├── features.ts       # Pro feature gating
├── supabase/         # Database clients
├── gemini/           # AI generation
└── images.ts         # Image utilities

messages/             # i18n (en.json, pt.json)
```

---

## 📜 Scripts

```bash
pnpm dev       # Start dev server (port 3000)
pnpm build     # Production build
pnpm start     # Start production server
pnpm lint      # Run ESLint
```

---

## 🌐 Deployment

| Service | Platform |
|---------|----------|
| Frontend | [Vercel](https://vercel.com) (recommended) |
| Backend | [Supabase](https://supabase.com) (hosted) |

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cgoncalves94/wardrobe-app)

---

## 📄 License

[MIT](LICENSE) © [Cesar Goncalves](https://github.com/cgoncalves94)

---

<div align="center">

**[⬆ Back to top](#-wardrobe)**

</div>
