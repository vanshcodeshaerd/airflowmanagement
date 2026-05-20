
## Goal

Ship a separate Admin Portal at `/admin/*` that shares one database with the user portal, so every admin change (delay, cancel, gate change, force check-in, etc.) shows up immediately on the passenger side. Built on Lovable Cloud (Postgres) today, with every DB call routed through a thin repository layer so a future Oracle backend is a one-file swap. Out of scope this turn (per your pick): visual gate grid, analytics dashboards, notification-center UI, audit-log viewer.

## What you'll see

```text
/admin
 ├── /dashboard              ← 2-card landing (Airport Mgmt / Passenger Mgmt) + live KPIs
 ├── /airports               ← airport directory with admin badges + "Manage" CTA
 ├── /airports/$code         ← date picker + flight ops table + "Add Flight"
 │    └── flight side-panel  ← Overview · Seats · Gate · Delay · Cancel · Passengers
 ├── /passengers             ← 3 tabs: All Users · Today's Flights · Boarding Tracker
 └── /passengers/flight/$id  ← full passenger manifest per flight
```

Admin theme = darker navy (#001f3f) header bar + same fonts as user portal. All buttons stay square per the existing design.

## Access control (the "both" answer you picked)

- Client unlocks the `/admin/*` UI when the signed-in email starts with `admin_` AND the seeded `admin_demo@airportms.com` account is used — keeps the spec's "special credentials" UX.
- Every server function that mutates anything goes through a new `requireAdmin` middleware that calls `has_role(auth.uid(), 'admin')`. RLS on the existing tables already enforces the same; the middleware just fails fast with a clear 403 before touching the DB.
- A new pathless layout `src/routes/_admin.tsx` redirects to `/dashboard` if the user lacks the admin role, so the UI can't be opened by typing the URL.

## Database changes (Postgres, Oracle-shaped naming)

One migration adds the five tables you kept. All use `gen_random_uuid()` PKs, `timestamptz`, and standard `created_at`. Soft-delete only — nothing is ever hard-deleted.

- `admin_actions` — audit trail of every admin mutation (action_type, target_entity, target_id, previous_value, new_value, reason, admin_id, ip).
- `passenger_notifications` — one row per affected booking on delay/cancel/gate-change; `is_read` flag, type enum, message text. Read by future bell UI; for now the row + a manual refresh on the passenger booking page surfaces it.
- `refund_records` — one row per cancelled booking; amount, reason, status (Pending/Processing/Completed), processed_at.
- `boarding_pass_updates` — log of every change applied to a boarding pass (gate_change / delay / cancellation).
- A few new columns on existing tables:
  - `flights.is_active boolean default true`, `flights.cancellation_reason text`, `flights.cancelled_at timestamptz`
  - `bookings.cancellation_reason text`, `bookings.cancelled_at timestamptz`
  - `boarding_passes.is_valid boolean default true`, `boarding_passes.invalidation_reason text`, `boarding_passes.is_updated boolean default false`, `boarding_passes.update_reason text`

Two new SECURITY DEFINER Postgres functions do the heavy lifting atomically:

- `admin_delay_flight(p_flight_id, p_delay_minutes, p_reason)` — shifts departure + arrival, updates boarding-pass times, inserts `flight_status_history`, `admin_actions`, `boarding_pass_updates`, and one `passenger_notifications` row per booking.
- `admin_cancel_flight(p_flight_id, p_reason)` — sets flight to Cancelled, marks bookings Cancelled, inserts `refund_records` for each, flips boarding passes to `is_valid=false`, releases the gate assignment, logs everything, notifies all booked passengers.

RLS for the new tables: `admin` role full access; passengers can read their own `passenger_notifications` and `refund_records` only.

## Server functions (repository layer)

All admin DB access lives in three new `.functions.ts` files. Every handler runs `requireAdmin`. Each function is a one-liner over `supabaseAdmin` so swapping to Oracle later means rewriting only these files.

- `src/lib/admin-airports.functions.ts` — `listAdminAirports`, `getAirportOpsSummary` (today's flights count, gates in use, delayed count).
- `src/lib/admin-flights.functions.ts` — `listAirportFlightsByDate`, `getFlightDetails`, `getFlightPassengers`, `createFlight`, `updateFlightFields`, `changeFlightStatus`, `changeFlightGate` (uses existing `assign_gate_for_flight` + collision check), `delayFlight` (calls `admin_delay_flight`), `cancelFlight` (calls `admin_cancel_flight`), `softDeleteFlight`.
- `src/lib/admin-passengers.functions.ts` — `listAllUsers`, `listTodaysPassengers`, `listBoardingStatusByFlight`, `forceCheckIn`, `markBoarded`, `markNoShow`, `cancelBooking` (with refund row).

Booking lifecycle: `bookings.booking_status` extended to support `'Checked-In' | 'Boarded' | 'NoShow' | 'Cancelled'` in addition to `Confirmed`. No new `check_in_records` table this turn — status on the booking is enough for Phase 1 and avoids the bigger Oracle-shaped check-in schema you scoped out.

## UI pages

All under a new `src/routes/_admin/` layout group:

1. **`_admin/dashboard.tsx`** — 2 cards (Airport Mgmt / Passenger Mgmt) with live KPIs pulled from one combined server fn; footer bar with bookings-today, revenue-today, cancelled-today, active-users.
2. **`_admin/airports.tsx`** — reuses your existing `AirportCard` grid but renders admin badges (flights today, gates in use, active bookings) and a "Manage" CTA per card.
3. **`_admin/airports.$code.tsx`** — top info panel, date picker (Yesterday / Today / Tomorrow), status counters, flight table with inline status / gate / terminal / delay editors, "Add New Flight" button that opens a modal wizard. Flight rows colour-coded as in the spec. Clicking a flight number opens the side-panel.
4. **`_admin/_flight-panel`** — modal/side-panel with 5 tabs: Overview, Seat Availability, Gate Assignment (uses existing `gates` table + conflict check), Delay Management (preview of cascading time shift before apply), Cancel Flight (typed-CANCEL confirmation), Passengers (mini manifest with per-row actions).
5. **`_admin/passengers.tsx`** — KPI bar + 3 tabs (All Users / Today's Flights / Boarding Tracker). Boarding tracker is one card per flight with a progress bar.
6. **`_admin/passengers.flight.$flightId.tsx`** — full per-flight manifest with bulk + per-row actions.

All inline edits use optimistic updates and revalidate via `router.invalidate()` so passenger-side data refreshes in adjacent tabs after a few seconds.

## Cascading update guarantees

Every mutation that touches multiple tables runs inside a single SECURITY DEFINER Postgres function (delay, cancel, gate change) so partial failures can't leave the DB inconsistent. `admin_actions` and `passenger_notifications` rows are written inside the same function call.

## Validation rules enforced server-side

- Flight number uniqueness on create.
- Departure must be ≥24h in the future on create (matches existing booking visibility window).
- Source ≠ destination.
- Gate conflict check uses the existing 15-minute turnover logic from `assign_gate_for_flight`.
- Cancel requires `confirm: "CANCEL"` field on the wire.

## What's deliberately excluded this turn

- Visual gate grid per terminal (Phase 2).
- Analytics / reports module (Phase 2).
- Passenger notification bell + toast UI (rows are written; UI later).
- Audit-log viewer page (data is captured; viewer later).
- Hard delete (we soft-delete only, always).

## Risks / things to confirm during implementation

- **Booking status enum widening** affects user-side booking lists; I'll audit `src/lib/flights.functions.ts` and the boarding-pass page so cancelled / boarded statuses render sensibly there.
- The seeded admin account (`admin_demo@airportms.com`) already gets `role='admin'` via your `handle_new_user_role` trigger — no extra setup needed.
- This is a large change set; if anything regresses on the passenger side I'd rather fix forward than try to ship Phase 2 on top.

If this looks right I'll start with the migration, then the repository server fns, then the UI in the order listed above.
