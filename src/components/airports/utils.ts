import type { Airport } from "./types";

export function getDirectionsUrl(a: Pick<Airport, "latitude" | "longitude" | "iata_code" | "airport_name">) {
  const label = encodeURIComponent(`${a.iata_code} ${a.airport_name}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${a.latitude},${a.longitude}&destination_name=${label}`;
}

export function getPinUrl(a: Pick<Airport, "latitude" | "longitude">) {
  return `https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}`;
}
