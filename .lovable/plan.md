
# Flight Booking Portal — Phase 1

Scope: schema + realistic flight data + search/filter UI + booking wizard through review + boarding pass tied to booking ID and saved to the signed-in user's profile. **Out of scope this turn:** real payment gateway, email sending, cron job (client-side 24h filter only), seat-map picker (auto-assign), add-ons.

## 1. Database (migration)

New tables in `public`:

- **airlines** — `code`, `name`, `logo_url`, `price_multiplier`. Seeded with the 6 carriers (AI, 6E, UK, SG, G8, 9W) plus logo URLs from Wikimedia.
- **airport_routes** — `source_code`, `destination_code`, `distance_km`, `duration_minutes`. Curated per airport so seeded flights match what each airport actually serves (e.g. AGR → DEL only; DEL → 40+ destinations; BOM → 35+; etc.). RLS: public read.
- **flights** — full structure from the brief (flight_number, airline_code, source/destination, departure/arrival datetime, aircraft_type, stops, 4 class prices, status, gate, is_visible_on_ui, etc.). RLS: public read; admin write.
- **bookings** — `booking_id TEXT PK` (format `AI-YYYYMMDD-NNNNNN-XXXXXX`), `user_id`, `flight_id`, passenger fields, `email`, `cabin_class`, `seat_number` (auto-assigned text like `12A`), `total_amount`, `status`. RLS: users see/insert/update their own.
- **boarding_passes** — `booking_id PK`, `user_id`, `flight_id`, `passenger_name`, `seat_number`, `boarding_group`, `gate_number`, `boarding_time`, `qr_data` (string encoding bookingId|flight|name|seat). RLS: users see their own. Created automatically when a booking is confirmed.

A trigger on `bookings` insert creates the matching `boarding_passes` row.

## 2. Seed data (insert tool, not migration)

- Insert the 6 airlines with Wikimedia logo URLs.
- Insert the route map. Source-of-truth: for each of the 41 active airports I look up the real city-pair network (using web search for the less-obvious ones like AGR, IXC, GAU, etc.) and only insert routes that actually exist. Distance and duration come from real values, not formulas.
- Generate flights for the **next 14 days**, only on the curated routes, with realistic departure slots (early-morning, mid-morning, afternoon, evening). Aircraft type matches the airline + route distance (A320/A321 for short, 787/777/A350 for long). Pricing follows the brief's formula (distance × ₹15 × airline multiplier × class multiplier, weekend ×1.25). Expected volume: ~2000 flight rows across the network; AGR-rooted flights will be small (a handful of daily DEL/BOM connections, matching reality).

## 3. Server functions (`src/lib/flights.functions.ts`, `src/lib/bookings.functions.ts`)

- `searchFlights({ source, destination, date, cabinClass, passengers })` — public; queries flights where `departure_datetime >= now() + 24h` and date matches, ordered by departure. Returns joined airline name + logo.
- `getFlightById(id)` — public.
- `createBooking({ flightId, passenger, cabinClass })` — auth required (`requireSupabaseAuth`). Generates booking ID (`{airlineCode}-{YYYYMMDD}-{random6}-{sha256(email).slice(0,6)}`), auto-assigns a seat (next available row letter), computes total from the flight's class price, inserts the booking. Trigger creates the boarding pass.
- `getMyBookings()` — auth; returns user's bookings with flight + boarding pass joined.
- `getBoardingPass(bookingId)` — auth; returns the boarding pass + flight + passenger.

## 4. Routes & components

```text
src/routes/airport.$code.book-flight.tsx        (main page)
src/routes/_authenticated/my-bookings.tsx       (user's bookings + boarding passes)
src/routes/_authenticated/boarding-pass.$bookingId.tsx
```

Components under `src/components/booking/`:

- `FlightSearchForm` — source (prefilled from URL param), destination, date (default tomorrow, range +1 to +90 days), passengers, cabin class.
- `FilterSidebar` — airlines, price range, departure window, duration, stops, sort.
- `FlightResultsList` + `FlightCard` — horizontal card; client-side filter applies the 24h rule defensively even though server already filtered.
- `BookingWizard` — 3 steps: (1) confirm flight + class, (2) passenger details form with zod validation, (3) review. "Confirm booking" button calls `createBooking` then routes to `/boarding-pass/:bookingId`.
- `BoardingPass` — printable card: airline logo, route, times, gate, seat, boarding group, QR (using `qrcode.react`), booking ID. Linked from My Bookings.

Dashboard "Book Flight" button (already on `AirportDashboard`) navigates to `/airport/$code/book-flight`.

## 5. Auth touch-points

- Search is public; booking requires auth. Unauthenticated users clicking "Continue" on the wizard get redirected to `/login`.
- My Bookings page lives under `_authenticated/` so the boarding pass history is implicitly "saved in the user profile".

## 6. Design

Reuse existing semantic tokens (`primary`, `accent`, etc.). Buttons keep current radius (won't override to fully square unless asked — current dashboard uses rounded buttons). Cards use the same `shadow-elegant` and motion patterns already in `AirportDashboard.tsx` for visual consistency.

## 7. Out of scope (next turn)

Payment gateway UI + transactions table, real email + PDF attachment, pg_cron visibility job, interactive seat map, add-ons (baggage/meals/insurance), admin flight CRUD UI.

---

After you approve, I'll execute in this order: (1) migration, (2) airline + route + flight seeding via insert tool, (3) server functions, (4) routes/components, (5) wire dashboard "Book Flight" button.
