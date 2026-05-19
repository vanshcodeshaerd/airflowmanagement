## Goal
Make each airport's location clickable so it opens Google Maps with directions to that specific airport, using its real lat/lng already stored in the database.

## Approach
No new dependencies, no API key needed — use Google Maps universal URL scheme that works with any user's device/account and auto-uses their current location as the origin:

```
https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&destination_place_id=<IATA>%20<airport_name>
```

This guarantees a unique destination per airport (lat/lng is unique per row in the `airports` table) and triggers turn-by-turn directions from the user's current location.

## Changes

1. **`src/components/airports/AirportCard.tsx`**
   - Wrap the location row (city, state + coordinates) in a button/link.
   - On click: `window.open(mapsUrl, '_blank', 'noopener,noreferrer')`.
   - Add a small `MapPin` / `Navigation` icon + hover state to signal it's clickable.
   - `stopPropagation` so it doesn't trigger the card's detail-modal open.

2. **`src/components/airports/AirportDetailModal.tsx`**
   - Add a prominent "Get Directions" button in the location section that opens the same Maps URL.
   - Show the lat/lng as a secondary clickable line opening the airport pin (`maps/search/?api=1&query=<lat>,<lng>`).

3. **`src/components/airports/utils.ts`** (new, tiny)
   - `getDirectionsUrl(airport)` and `getPinUrl(airport)` helpers so both card and modal stay consistent.

## Out of scope
- No embedded map iframe (avoids needing the Google Maps browser key / referrer setup).
- No DB changes — lat/lng already exists and is unique per airport.
- No admin UI changes.
