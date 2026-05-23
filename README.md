# AirFlow — Airport & Flight Management Platform

A full-stack airport operations platform with passenger booking, boarding passes, UPI payments, refund management, and an admin operations console. Built on TanStack Start (React 19 + SSR on Cloudflare Workers) with Lovable Cloud (Supabase) as the backend.

🌐 **Live:** https://airflowmanagement.lovable.app

---

## ✨ Features

### Passenger / User
- **Auth** — Email/password + Google OAuth (Supabase Auth)
- **Airport directory** — Browse airports with filters, map view, and detail pages
- **Flight search & booking** — Search flights, pick seats by cabin class, confirm with UPI payment
- **Boarding passes** — Auto-generated QR boarding passes per booking
- **Real-time flight status** — Status timeline (Scheduled → Boarding → Departed → Arrived)
- **Refund portal** — Request refunds, track status, auto-refunds on flight cancellation
- **Notifications** — In-app bell with delay / gate change / cancellation / refund alerts

### Admin
- **Dashboard KPIs** — Today's flights, bookings, delays, cancellations, revenue
- **Flight operations** — Delay, cancel, reassign gates with full audit + passenger notifications
- **Airport management** — CRUD airports, services, airlines
- **Refund management** — Approve / reject / bulk-refund with admin notes and audit trail
- **Audit log** — Every admin action recorded in `admin_actions`

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start v1 (React 19, SSR) |
| Routing | TanStack Router (file-based) |
| Data | TanStack Query + `createServerFn` RPC |
| Styling | Tailwind CSS v4 + shadcn/ui + Radix |
| Animation | Framer Motion |
| Forms / Validation | React Hook Form + Zod |
| Backend | Lovable Cloud (Supabase: Postgres, Auth, Realtime, RLS) |
| Maps | Google Maps |
| Build / Runtime | Vite 7 + Cloudflare Workers |

---

## 📂 Project Structure

```
src/
├── routes/                       # File-based routes
│   ├── __root.tsx                # Root layout
│   ├── index.tsx                 # Landing page
│   ├── auth.tsx                  # Login / signup
│   ├── _authenticated/           # Logged-in user routes
│   │   ├── airport.$code.*       # Dashboard, flights, boarding pass, status
│   │   ├── dashboard.airports.tsx
│   │   └── refund.tsx
│   └── admin.*                   # Admin console (operations, refunds, airports)
├── lib/                          # *.functions.ts — server functions (RPC)
│   ├── admin-auth.functions.ts
│   ├── admin-dashboard.functions.ts
│   ├── admin-flights.functions.ts
│   ├── airports.functions.ts
│   ├── flights.functions.ts
│   ├── flight-status.functions.ts
│   └── payments-refunds.functions.ts
├── components/
│   ├── admin/                    # Admin sidebar, refund modals, flight actions
│   ├── airports/                 # Directory, cards, detail, map
│   ├── airport-dashboard/
│   ├── auth/                     # Login / signup forms, social buttons
│   ├── landing/                  # Hero, features, gallery, footer
│   ├── notifications/            # NotificationBell
│   ├── payments/                 # UPI payment box
│   ├── refunds/                  # Status badge
│   └── ui/                       # shadcn/ui primitives
├── integrations/supabase/        # Auto-generated clients (do not edit)
├── styles.css                    # Design tokens (oklch)
└── server.ts                     # SSR entry (Cloudflare Worker)

supabase/migrations/              # SQL migrations (schema, RLS, RPCs)
```

---

## 🗄️ Database

Major tables: `airports`, `flights`, `gates`, `flight_gate_assignments`, `bookings`, `passenger`, `payment`, `boarding_passes`, `boarding_pass_updates`, `refund_records`, `passenger_notifications`, `flight_status_history`, `profiles`, `user_roles`, `admin_actions`.

Key SECURITY DEFINER functions:
- `has_role(uid, role)` — RLS role check
- `confirm_booking_with_payment(...)` — atomic booking + payment
- `admin_delay_flight`, `admin_cancel_flight`, `admin_change_gate` — admin ops with cascade (notifications, boarding-pass updates, auto-refunds)
- `assign_gate_for_flight` — conflict-free gate assignment

**Security model:** Row Level Security on every table. Owner-scoped reads (passengers only see their own bookings/payments/boarding passes via `EXISTS` joins to `bookings`). Admin role required for all destructive ops. PII tables removed from realtime publication.

---

## 🚀 Running Locally

```bash
bun install
bun run dev          # http://localhost:8080
bun run build        # production build
bun run lint
```

`.env` (Supabase credentials) is managed by Lovable Cloud — do not edit by hand.

---

## 🔐 Admin Access

Admin role is gated server-side. A user becomes admin only when:
- email starts with `admin_`
- password ends with `!ADMIN2024`
- credentials verify against Supabase Auth

Then `ensureAdminRoleForCredential` upserts `user_roles.role = 'admin'`.

---

## 🛠️ Editing

- Open in [Lovable](https://lovable.dev/projects/b930a068-367c-4ba9-8787-438585183df1) — changes auto-commit
- Or clone and push — Lovable syncs both ways

---

## 📦 Deployment

Click **Publish** in Lovable. To use a custom domain, go to **Project → Settings → Domains**.
```
