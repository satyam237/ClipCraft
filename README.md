# ClipCraft

Video and clip management app built with Next.js and Supabase. Upload, organize, and share videos with workspace support, folders, and Supabase-backed auth and storage.

## Tech stack

- **Next.js 16** (App Router), **React 19**
- **Supabase** (auth, database, storage)
- **Tailwind CSS 4**, Radix UI, Lucide icons
- **Zustand**, Dexie (IndexedDB)

## Prerequisites

- Node.js 18+ (or 20+ recommended)
- npm, yarn, or pnpm
- A [Supabase](https://supabase.com) project

## Setup

1. Clone the repo and install dependencies:

   ```bash
   git clone <repo-url>
   cd ClipCraft
   npm install
   ```

2. Copy the env template and add your Supabase credentials:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and set:

   - `NEXT_PUBLIC_SUPABASE_URL` – from Supabase: Project Settings → API → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – from Supabase: Project Settings → API → anon public key
   - `NEXT_PUBLIC_SITE_URL` – optional; defaults to current origin (e.g. `http://localhost:3000` for local dev)

3. Apply the database schema in your Supabase project:

   - Run the SQL in `supabase/migrations/` via the Supabase Dashboard (SQL Editor) or using the [Supabase CLI](https://supabase.com/docs/guides/cli).

## Running

- **Development:** `npm run dev` – app at [http://localhost:3000](http://localhost:3000)
- **Production build:** `npm run build` then `npm run start`
- **Lint:** `npm run lint`
