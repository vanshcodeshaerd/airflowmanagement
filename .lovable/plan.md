# Plan: Surface Legacy Data on UI + Admin Sync

The 8 new legacy tables (location, terminal, aircraft_model, passenger, payment, baggage, check_in, flight_stops) currently only exist in the DB. This plan exposes them in the UI and wires them into the existing realtime sync so admin changes appear instantly on the user side.

## What gets added to the UI

### User-side (passenger app)

1. **My Bookings → expanded booking detail card**
   - Payment block: amount, method, status, transaction ref (from `payment`)
   - Baggage block: tag ID, weight, type, status (from `baggage`)
   - Check-in block: status, method, seat confirmed, boarding-pass issued (from `check_in`)
   - Flight stops: "Direct" or list of intermediate stops (from `flight_stops`)

2. **Flight Status / Flight Detail pages**
   - Aircraft info chip: model, airline, seating capacity (from `aircraft_model` via `flights.model_id`)
   - Stops indicator: "Non-stop" vs "1 stop via DEL" (from `flight_stops`)

3. **Airport detail pages**
   - Terminals list: terminal number, name, capacity (from `terminal` filtered by `location_id`)

### Admin portal (new management screens)

Reachable from existing admin sidebar:

1. **Passengers** — list + search, edit contact/passport, deactivate
2. **Payments** — list, filter by status, mark refunded
3. **Baggage** — list by flight, update status (Checked-in → Loaded → Arrived → Claimed)
4. **Check-ins** — list by flight, toggle status, reissue boarding pass
5. **Flight Stops** — add/remove stops per flight number
6. **Aircraft Models** — CRUD (model, airline, capacity, class pricing)
7. **Terminals** — CRUD per location

All admin writes go through `createServerFn` + `requireSupabaseAuth` with admin role check (matching existing `admin-flights.functions.ts` pattern).

## Realtime sync

Extend the existing `RealtimeSync` subscription in `src/routes/__root.tsx` to also listen for changes on: `passenger`, `payment`, `baggage`, `check_in`, `flight_stops`, `aircraft_model`, `terminal`, `location`.

Migration enables realtime publication + `REPLICA IDENTITY FULL` on these 8 tables. On any change, `queryClient.invalidateQueries()` + `router.invalidate()` fires — so an admin updating baggage status instantly updates the passenger's booking screen.

## Technical structure

```
src/lib/
  legacy.functions.ts          (extend: add admin write fns + per-booking read fns)
  admin-passengers.functions.ts
  admin-payments.functions.ts
  admin-baggage.functions.ts
  admin-checkin.functions.ts
  admin-stops.functions.ts
  admin-aircraft.functions.ts
  admin-terminals.functions.ts

src/routes/
  admin.passengers.tsx
  admin.payments.tsx
  admin.baggage.tsx
  admin.checkin.tsx
  admin.stops.tsx
  admin.aircraft.tsx
  admin.terminals.tsx

src/components/booking/
  BookingPaymentCard.tsx
  BookingBaggageCard.tsx
  BookingCheckinCard.tsx
  FlightStopsBadge.tsx
  AircraftInfoChip.tsx
```

Linking key between booking and legacy tables: `bookings.booking_id` ↔ `payment.booking_id`; `bookings.passenger_passport_id` (or ticket) ↔ `passenger.ticket_number` ↔ `baggage.ticket_number` ↔ `check_in.ticket_number`. Where the join is loose (legacy seeded data uses ticket numbers like T501–T506), I'll backfill `ticket_number` on existing bookings via a one-time SQL update so the join works for real bookings too.

## Out of scope

- Renaming current tables to uppercase Oracle names
- Building a payments gateway flow (admin-only mark-as-paid for now)
- Importing/exporting Oracle DMP files

## Confirm before I build

Approve and I'll ship in this order: (1) migration for realtime + ticket backfill, (2) read components on user side, (3) admin CRUD screens, (4) extend RealtimeSync.
