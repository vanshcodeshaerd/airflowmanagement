
## Goal

Bring the live Postgres database in line with the original Oracle DDL/DML (12 source-of-truth tables) **without breaking the existing UI, routes, design, or admin portal**. Original rows (L101–L106, F101–F106, P1–P6, B1–B6, Pay1–Pay6, R1–R2, C1–C6, baggage, flight stops) must appear in the user-facing pages, and the codebase must reference the original names (LOCATION, FLIGHT, BOOKING, PASSENGER, PAYMENT, REFUND_INFO, CHECK_IN, BAGGAGE, FLIGHT_STOPS, GATE, TERMINAL, AIRCRAFT_MODEL).

## Reality check before we start

The current app already runs on Postgres tables `airports`, `flights`, `bookings`, etc., with RLS policies, triggers, `assign_gate_for_flight`, `admin_delay_flight`, `admin_cancel_flight`, `admin_change_gate`, realtime publications, and a generated `types.ts` that every server function imports. A literal rename of every table to Oracle UPPERCASE names would:

- invalidate every RLS policy, trigger, and SECURITY DEFINER function we just wrote,
- regenerate `types.ts` and break every `.from("flights")` / `.from("bookings")` call across `src/lib/*.functions.ts` and components,
- break the realtime channel and the admin RPCs that just started working.

So the plan threads the needle: **keep the working physical tables, add the missing original tables, seed the original DML, expose the Oracle names via SQL VIEWS, and add the missing columns (IATA_Code, Airport_Name, etc.) on existing tables.** The UI continues to read from the existing tables; the original names are available for any query the user wants to write against them.

If you'd rather do a hard rename (riskier, ~2–3 days of code churn, will regress admin features), say so and I'll redo the plan.

## Phase 1 — Database migration (single SQL migration)

1. **Add the 4 missing original tables** that don't exist today:
   - `passenger` (Ticket_Number PK, name, age, nationality, contact_info, email, passport_id)
   - `payment` (Payment_ID PK, Ticket_Number, amount, method, status, timestamp, booking_id, txn_ref)
   - `baggage` (Tag_ID PK, Ticket_Number, weight, status, flight_number, created_at)
   - `check_in` (Checkin_ID PK, Ticket_Number, flight_number, status, method, boarding_pass_issued, seat_confirmed)
   - `flight_stops` (flight_number, stop_number, stop_location)
   - `aircraft_model` (Model_ID PK, airline_name, seating_capacity, iata_airline_code, aircraft_type, seat counts, prices)
   - `terminal` (Terminal_Number PK, name, capacity, location_id)
   - `location` (Location_ID PK 'L101'…, city, state, country, iata_code, airport_name, lat, lng, totals)
   - All with RLS: `anyone reads`, `admins manage`.

2. **Extend existing tables with original-shape columns** (ALTER ADD COLUMN, no drops):
   - `airports`: add `location_id text` (back-fill L101–L106 mapped to BOM/DEL/BLR/MAA/HYD/CCU).
   - `flights`: add `flight_number_original text`, `model_id text`, `origin_location_id text`, `destination_location_id text`, `is_visible_on_ui boolean default true`, `is_bookable boolean default true`.
   - `gates`: add `max_aircraft_size text`, `terminal_number text`.

3. **Seed original DML** with idempotent `INSERT … ON CONFLICT DO NOTHING`:
   - 6 locations L101–L106 (mapped to existing IATA codes via new `location_id` column on airports).
   - 6 terminals T1–T6, 7 gates G1–G7, 5 aircraft models M1–M5.
   - 6 flights F101–F106 inserted into both the new `flight` original-shape view-backing rows AND into the existing `flights` table so the existing UI lists them at AMD/BOM/etc.
   - 6 passengers P1–P6, 6 bookings, 6 payments, 2 refunds, 6 baggage rows, 6 check-ins, 6 flight stops.
   - Refunds reuse the existing `refund_records` table (the original `REFUND_INFO` is a near-perfect match — just add `refund_reason`/`refund_type` already present).

4. **Expose Oracle names via SQL VIEWS** so anyone querying `LOCATION`, `FLIGHT`, `BOOKING`, etc., gets the right data without breaking current code:
   - `CREATE VIEW location AS SELECT … FROM airports …`
   - `CREATE VIEW flight AS SELECT … FROM flights …`
   - `CREATE VIEW booking AS SELECT … FROM bookings …`
   - `CREATE VIEW passenger AS SELECT … FROM passenger` (real table)
   - `CREATE VIEW payment AS SELECT … FROM payment`
   - `CREATE VIEW refund_info AS SELECT … FROM refund_records`
   - `CREATE VIEW check_in AS SELECT … FROM check_in`
   - Views inherit RLS via `security_invoker = on`.

## Phase 2 — Wire original data into the existing UI (no route or design changes)

Nothing in `src/routes/**`, `src/components/**`, or `src/styles.css` is renamed or restyled. We only:

- Extend `src/lib/flights.functions.ts` and `src/lib/airports.functions.ts` so the list/search queries include the seeded F101–F106 / L101–L106 rows (they will already appear once seeded, since the existing tables get the inserts — no code change needed beyond verifying the date filter doesn't hide April 2026 flights).
- Add lightweight server fns under `src/lib/legacy.functions.ts` for the original-only entities so admin / user pages can read them when needed:
  - `listOriginalPassengers`, `listOriginalBookings`, `listOriginalPayments`, `listOriginalRefunds`, `listOriginalBaggage`, `listOriginalCheckIns`, `listOriginalFlightStops`.
- These are additive; existing booking/check-in flows for **new** users keep using the current `bookings` / `boarding_passes` tables.

## Phase 3 — Verification

- Migration runs cleanly; `supabase--read_query` confirms 6 rows in each original table.
- `/airport/BOM/flights` (and AMD, DEL…) lists F101–F106 when the date filter is set to April 2026.
- Admin portal still works: delay / cancel / gate change RPCs untouched.
- Realtime channel still fires on `flights`, `bookings`, `boarding_passes`.

## Out of scope this turn (deliberate)

- Renaming physical tables to UPPERCASE singular (would regress the admin portal we just finished).
- Rewriting every `.from("flights")` call in TypeScript to `.from("FLIGHT")`.
- New UI pages for baggage / check-in / flight stops / payments listings — the data is there, but new pages can come in a follow-up turn so this change set stays reviewable.
- Oracle sequences / triggers from the original Phase-4 spec — Postgres uses `gen_random_uuid()` / identity, which is functionally equivalent and already in place.

## One question before I write the migration

The original DML uses dates `2026-04-10 … 2026-04-15`. Today is **May 20, 2026**, so those flights are all in the past and won't appear on the user-side flight search (which filters to departures ≥24h in the future). Pick one:

- **A.** Seed F101–F106 with the original April 2026 dates exactly as written. They will only be visible in admin views / history, not the booking flow.
- **B.** Shift the seeded flight dates forward by ~30 days (keep flight numbers, route, gate, model, status) so F101–F106 appear in the live user flight search and can actually be booked.

If you don't answer, I'll go with **B** so the original data is actually visible in the app, which matches the spec's "Display Original Data In UI" goal.

