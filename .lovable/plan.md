## Goal
Build a single `/auth` page that handles both Login and Signup, matching the spec's design (square buttons, navy/teal palette, Playfair/Inter/Poppins, framer-motion animations, split layout). Admin uses one predefined credential; regular users go through real signup/login backed by the database.

## Auth model
- **Admin (hardcoded):** single predefined credential checked client-side before hitting auth backend.
  - Email: `admin_demo@airportms.com`
  - Password: `Demo123!ADMIN2024`
  - On match: set `localStorage.userRole = "ADMIN"`, navigate to `/admin-dashboard`. No account is created in the database.
- **Users (real):** Lovable Cloud (email/password + Google).
  - Signup creates a real `auth.users` row plus a `profiles` row with full_name.
  - Login uses `supabase.auth.signInWithPassword`.
  - Google sign-in via the Lovable broker (`lovable.auth.signInWithOAuth("google", ...)`).
  - On success: `localStorage.userRole = "USER"`, navigate to `/user-dashboard`.

Note: redirect targets (`/admin-dashboard`, `/user-dashboard`) will 404 until built later, as requested.

## Backend (Lovable Cloud)
Enable Lovable Cloud, then:

1. `profiles` table:
   - `id uuid primary key references auth.users(id) on delete cascade`
   - `full_name text not null`
   - `created_at timestamptz default now()`
2. RLS on `profiles`: users can `select`/`update` their own row.
3. Trigger `handle_new_user` on `auth.users` insert → inserts into `profiles` using `raw_user_meta_data->>'full_name'`.
4. Enable Google provider via `supabase--configure_social_auth`.
5. Enable leaked-password (HIBP) protection.

No `user_roles` table is created — roles aren't stored server-side because admin is hardcoded and all DB-backed users are regular users. This is documented as an accepted tradeoff in the security memory.

## Frontend

### Route
- New file `src/routes/auth.tsx` → path `/auth`.
- `head()` with title, meta description, keywords, `robots: noindex, follow`, canonical, og tags, JSON-LD WebApplication.
- Update Header's "Get Started" button + Hero CTAs to `<Link to="/auth">`.

### Components (`src/components/auth/`)
- `AuthPage.tsx` — split layout (left: bg image w/ gradient overlay & subtle zoom; right: form container).
- `AuthHeader.tsx` — back-to-home + help link.
- `FormTabs.tsx` — Login / Sign Up toggle with sliding teal underline.
- `LoginForm.tsx` — email, password (eye toggle), remember-me, forgot-password link, submit, error alert with shake.
- `SignupForm.tsx` — full name, email, password (with strength bar), confirm password (match indicator), terms checkbox, submit, success state.
- `SocialAuthButtons.tsx` — Google button + tab-switch link.
- `PasswordStrengthIndicator.tsx` — colored fill bar (weak/medium/strong).
- `FormErrorAlert.tsx`, `SuccessMessage.tsx`.

### Validation
- react-hook-form + zod schemas matching spec (email RFC, password ≥8 with uppercase/number/special for signup; ≥6 for login; name 3–50; passwords match; terms required).

### Styling
- All buttons `border-radius: 0`.
- Tokens added to `src/styles.css` for the auth-specific colors (or reuse existing navy/teal/accent tokens — extend if missing).
- Fonts: Playfair Display headings, Inter labels/body, Poppins buttons/links.
- framer-motion: page slide-in, staggered fields, tab crossfade, error shake, success slide-up, bg zoom loop.

### Asset
- Generate one airport-terminal background image to `src/assets/auth-bg.jpg` (1600×1200, opacity overlay handled in CSS).

## Files created/changed
- create: `src/routes/auth.tsx`
- create: `src/components/auth/*` (8 files listed above)
- create: `src/lib/auth/validators.ts`, `src/lib/auth/adminCheck.ts`
- create: `src/assets/auth-bg.jpg`
- edit: `src/components/landing/Header.tsx`, `src/components/landing/HeroSection.tsx`, any other "Get Started" CTAs → link to `/auth`
- edit: `src/styles.css` (auth tokens if needed)
- DB migration: `profiles` table + RLS + trigger
- Config: enable Google provider, enable HIBP

## Technical notes
- Lovable Cloud handles password hashing, sessions, tokens — the spec's "no real backend, use setTimeout" is replaced with real auth per your direction.
- Admin credential is in client code (intentional, per your request). Anyone reading the bundle can see it. This is acceptable for a demo; for production we'd move admin detection server-side via a roles table.
- Email confirmation will be **disabled** so signup → immediate session → redirect works without an email round-trip (matches the spec's flow).
- The TanStack `_authenticated` layout pattern is **not** added here since dashboards aren't being built; we'll add it when those pages exist.
