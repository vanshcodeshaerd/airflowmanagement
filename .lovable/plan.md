## Goal

Build the Airport Selection & Directory page rendered at two routes that share one component with role-based behavior:

- `/dashboard/airports` — regular users browse, filter, search, select.
- `/admin/airports` — admins additionally add, edit, delete, and bulk-manage airports.

All airport data lives in the Lovable Cloud database (no mock array in code, no external API).

## Database (one migration)

Tables in `public`:

1. `airports`
   - `id uuid pk default gen_random_uuid()`
   - `iata_code text unique not null` (3 chars), `icao_code text unique` (4 chars)
   - `airport_name text not null`, `city text not null`, `state text not null`, `country text default 'India'`
   - `latitude numeric(10,6) not null`, `longitude numeric(10,6) not null`
   - `operator text`, `total_gates int`, `total_terminals int`, `total_runways int`
   - `category text check in ('Domestic','International','Private') default 'Domestic'`
   - `status text check in ('Active','Under Construction','Proposed') default 'Active'`
   - `annual_passengers_million numeric(10,2)`
   - `contact_phone text`, `contact_email text`, `website_url text`, `description text`
   - `is_active boolean default true`
   - `created_at`, `updated_at` timestamptz + `update_updated_at_column()` trigger

2. `airport_services` — `airport_id` fk cascade, `service_name text`, `is_available bool`, unique (airport_id, service_name).

3. `airport_airlines` — `airport_id` fk cascade, `airline_code`, `airline_name`, `is_active`.

4. Role infrastructure (since admin needs server-enforced privileges, not a client localStorage check):
   - `app_role` enum (`admin`, `user`)
   - `user_roles (user_id uuid → auth.users, role app_role, unique(user_id, role))`
   - `has_role(_user_id uuid, _role app_role)` security-definer function
   - The hardcoded demo admin (`admin_demo@airportms.com`) stays as a client-side shortcut for the *UI* only. Real DB writes require a real authenticated user with an `admin` row in `user_roles`. This is documented in code; the demo admin can browse/CRUD only in-memory via UI but server rejects writes unless they have an admin role. We'll seed one real admin role row tied to whichever user first signs up with the configured admin email (handled by trigger on `auth.users` insert).

### RLS

- `airports`, `airport_services`, `airport_airlines`:
  - `SELECT` to `authenticated` and `anon` where `is_active = true` (public directory — needed because user dashboard must read).
  - `INSERT / UPDATE / DELETE` only when `has_role(auth.uid(), 'admin')`.
- `user_roles`: select own rows; only admins can insert/update/delete (handled via has_role).

### Seed

Same migration inserts all ~45 airports from the spec (Andhra Pradesh through West Bengal), plus a default service set for the international/hub airports. Idempotent via `on conflict (iata_code) do nothing`.

## Server functions (`src/lib/airports.functions.ts`)

All use `requireSupabaseAuth` middleware.

- `listAirports({ search?, category?, state?, status?, sort? })` → reads `airports` + aggregated service/airline counts.
- `getAirport(id)` → full record including services and airlines.
- `createAirport(input)` — admin only (checks `has_role` server-side).
- `updateAirport(id, input)` — admin only.
- `deleteAirport(id)` — admin only.
- `bulkDeleteAirports(ids[])` — admin only.
- `getCurrentRole()` → returns `'admin' | 'user'` for UI gating.

Validation with zod (IATA length 3, ICAO length 4, lat/lng bounds, enums for category/status).

## Routing

- `src/routes/_authenticated.tsx` — pathless layout; `beforeLoad` checks `supabase.auth.getUser()` and redirects to `/auth` when missing. Renders `<Outlet />`.
- `src/routes/_authenticated/dashboard.airports.tsx` → `/dashboard/airports` (user mode).
- `src/routes/_authenticated/admin.airports.tsx` → `/admin/airports` (calls `getCurrentRole`; if not admin, redirects to user route).

Both routes render `<AirportDirectoryPage mode="user" | "admin" />`.

Each route sets its own `head()` with the title/description/keywords from the spec and `robots: noindex` (auth-gated content).

## Components (`src/components/airports/`)

- `AirportDirectoryPage.tsx` — page shell: header, breadcrumb, back button, filter bar, results summary with count-up, view toggle, grid/list, pagination, modal mount, admin controls mount.
- `FilterBar.tsx` — search input, category / state / status / sort dropdowns (shadcn Select), "Clear All" button. Controlled by `useAirportFilter` hook; all controls are square (radius 0) using existing `SquareButton` styling tokens.
- `AirportCard.tsx` — single card with IATA, name, city/state, gates/terminals/passengers grid, coords, operator, status badge, action buttons. Variants: `user` (Select + View Details), `admin` (View + Edit + Delete + selection checkbox).
- `AirportGrid.tsx` — responsive 1/2/3 column grid with framer-motion stagger.
- `AirportListByState.tsx` — collapsible state-grouped list view.
- `AirportDetailModal.tsx` — Dialog with full record, services, airlines.
- `AirportFormModal.tsx` — admin add/edit form (react-hook-form + zod) covering every column + services checkboxes.
- `DeleteConfirmDialog.tsx` — admin destructive confirm.
- `AdminBulkBar.tsx` — appears when selection > 0; bulk delete + status change.
- `Pagination.tsx` — local component (15/25/50 per page).

## Hooks (`src/hooks/airports/`)

- `useAirportData.ts` — wraps `useQuery(listAirports, …)` with filter state in query key.
- `useAirportFilter.ts` — state + setters for search/category/state/status/sort/page/perPage/view.
- `useCurrentRole.ts` — `useQuery(getCurrentRole)`.

## Animations

Framer Motion: header fade+slide, filter bar delayed fade, count-up via `useMotionValue`, card stagger (80ms), hover lift, modal scale 0.9→1, filter swap fade out/in. Respect `prefers-reduced-motion`.

## Styling

- Reuse existing tokens (`--navy`, `--accent`, `--accent-strong`, `--sky-soft`) from `src/styles.css`. Add `--success`, `--warning`, `--danger`, `--info` semantic tokens if not already present, used for badges (Domestic/International/Private + status). No raw hex in components.
- All buttons square via existing `SquareButton` or `rounded-none` variants.
- Fonts Playfair / Inter / Poppins already configured.

## What's intentionally out of scope

- CSV import/export (spec mentions, but I'll stub the buttons as "coming soon" unless you want them now).
- Heliports / private airport seed beyond category placeholder.
- Schema.org LocalBusiness JSON-LD per airport (page is noindex, low value).

Confirm and I'll proceed; if you want CSV import/export included, say so before approving.
