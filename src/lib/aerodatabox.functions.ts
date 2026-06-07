import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const HOST = "aerodatabox.p.rapidapi.com";

function authHeaders() {
  const key = process.env.RAPIDAPI_AERODATABOX_KEY;
  if (!key) throw new Error("AeroDataBox API key not configured");
  return {
    "x-rapidapi-key": key,
    "x-rapidapi-host": HOST,
  };
}

export interface LiveFlightInfo {
  flight_number: string;
  status: string;
  departure_scheduled?: string;
  departure_actual?: string;
  arrival_scheduled?: string;
  arrival_actual?: string;
  delay_minutes: number;
  origin_iata?: string;
  origin_terminal?: string;
  origin_gate?: string;
  destination_iata?: string;
  destination_terminal?: string;
  destination_gate?: string;
}

export const fetchLiveFlight = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        flight_number: z
          .string()
          .min(3)
          .max(8)
          .regex(/^[A-Z0-9]+$/i, "Letters/digits only"),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<LiveFlightInfo[]> => {
    const date = data.date ?? new Date().toISOString().slice(0, 10);
    const url = `https://${HOST}/flights/number/${encodeURIComponent(
      data.flight_number,
    )}/${date}?withAircraftImage=false&withLocation=false`;

    const res = await fetch(url, { headers: authHeaders() });
    if (res.status === 204 || res.status === 404) return [];
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`AeroDataBox error (${res.status}): ${txt.slice(0, 160)}`);
    }
    const raw = (await res.json()) as unknown;
    const list = Array.isArray(raw) ? raw : [];

    const parseDelay = (sched?: string, actual?: string) => {
      if (!sched || !actual) return 0;
      return Math.round((new Date(actual).getTime() - new Date(sched).getTime()) / 60000);
    };

    type FlightPoint = {
      airport?: { iata?: string };
      terminal?: string;
      gate?: string;
      scheduledTime?: { utc?: string };
      revisedTime?: { utc?: string };
      actualTime?: { utc?: string };
    };
    type FlightRow = {
      number?: string;
      status?: string;
      departure?: FlightPoint;
      arrival?: FlightPoint;
    };

    return (list as FlightRow[]).map((f) => {
      const depSched = f.departure?.scheduledTime?.utc;
      const depActual = f.departure?.revisedTime?.utc ?? f.departure?.actualTime?.utc;
      const arrSched = f.arrival?.scheduledTime?.utc;
      const arrActual = f.arrival?.revisedTime?.utc ?? f.arrival?.actualTime?.utc;
      return {
        flight_number: f.number ?? data.flight_number,
        status: f.status ?? "Unknown",
        departure_scheduled: depSched,
        departure_actual: depActual,
        arrival_scheduled: arrSched,
        arrival_actual: arrActual,
        delay_minutes: Math.max(
          parseDelay(depSched, depActual),
          parseDelay(arrSched, arrActual),
        ),
        origin_iata: f.departure?.airport?.iata,
        origin_terminal: f.departure?.terminal,
        origin_gate: f.departure?.gate,
        destination_iata: f.arrival?.airport?.iata,
        destination_terminal: f.arrival?.terminal,
        destination_gate: f.arrival?.gate,
      };
    });
  });
