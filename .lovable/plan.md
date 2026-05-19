## Goal
Show a hero image for each airport as a full-width background behind the IATA code / name / stats block on the airport dashboard header.

## Steps

### 1. Schema
Add `image_url TEXT NULL` to `public.airports` via migration. No RLS changes (existing public read covers it).

### 2. Seed image URLs
Populate `image_url` for all 41 active airports using Wikimedia Commons photo URLs (free, hotlink-safe). One curated URL per IATA. A generic fallback ("airport terminal") will be used in the UI when `image_url` is null, so future airports still look correct.

### 3. Types/serverFn
`getAirportByCode` and `Airport` type already `select('*')` — `image_url` flows through automatically after the auto-generated types refresh. No code edit needed in `airports.functions.ts`.

### 4. UI — `AirportDashboard.tsx` header section
Convert the `motion.section` (lines 129–174) into a full-bleed hero:
- Background: `airport.image_url` as a `<img>` absolutely positioned, `object-cover`, `w-full h-full`.
- Overlay: dark gradient (`bg-gradient-to-r from-primary/85 via-primary/65 to-primary/30`) for text legibility.
- Text colors switch to white (`text-white`, `text-white/80`) instead of `text-primary` / `text-muted-foreground`.
- `QuickStat` tiles: translucent white background (`bg-white/15 backdrop-blur-sm`), white text, white icons.
- Min height ~`min-h-[340px]` so the hero feels substantial; preserve responsive grid layout.
- Fallback: if `image_url` is empty, keep current `bg-gradient-to-b from-sky-soft to-white` so nothing breaks.

### Out of scope
- Airport directory cards (only the dashboard header per request "in this section").
- Image upload UI / admin editing.
- Storage buckets — using external Wikimedia URLs.
