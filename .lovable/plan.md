## Goal
Add a "Customer Support" tile to the bottom Quick Links row on the airport dashboard. Clicking it opens a small modal with four contact options pulled from the airport record.

## Changes

**1. `src/components/airport-dashboard/SupportModal.tsx`** (new)
- Lightweight modal (same Framer Motion pattern as `AirportDetailModal`).
- Receives `airport` prop (for `contact_phone`, `contact_email`, `iata_code`).
- Four action rows, each a square card:
  - **Call** — `tel:{contact_phone}`. If phone missing, show "Not available" disabled state.
  - **Email** — `mailto:{contact_email}?subject=Support request for {IATA}`. Disabled if missing.
  - **Live Chat** — button that toasts "Live chat coming soon" (no backend yet).
  - **FAQ / Help** — link to `/help` (stub; if route doesn't exist we use `<a href>` and add a tiny placeholder later or just toast).
- Icons: `Phone`, `Mail`, `MessageCircle`, `HelpCircle` from lucide-react.
- Styled consistent with existing modal (white panel, square corners, navy/teal palette).

**2. `src/components/airport-dashboard/AirportDashboard.tsx`** (edit)
- Add `supportOpen` state.
- Replace the current "Lost & Found" placeholder with a **Customer Support** tile (icon `Headphones` or `LifeBuoy`) that opens the modal. Keep the existing four-tile grid layout (Directions, Contact Info, Facilities, Customer Support) — Lost & Found can be dropped since it had no behavior, or kept by widening to 5 tiles. I'll keep the grid at 4 by replacing Lost & Found with Customer Support (cleaner, less clutter).
- Render `<SupportModal airport={airport} open={supportOpen} onClose={...} />` at the bottom.

## Out of scope
- No DB changes — we already store `contact_phone` and `contact_email` on `airports`.
- No real live-chat integration (just a "coming soon" toast).
- No `/help` page build — FAQ link is a placeholder that toasts.

## Technical notes
- Pure frontend; no server functions or migrations.
- Modal uses `sonner` toast (already in the project) for the unavailable channels.
