import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type FlightStatusRow = {
  id: string;
  flight_number: string;
  airline_code: string;
  airline_name: string;
  airline_logo: string | null;
  aircraft_type: string;
  source_code: string;
  destination_code: string;
  departure_datetime: string;
  arrival_datetime: string;
  duration_minutes: number;
  flight_status: string;
  gate_number: string | null;
  terminal: string | null;
  delay_minutes: number;
  delay_reason: string | null;
  actual_departure_time: string | null;
};

/**
 * Repository layer — every DB call lives here so swapping Postgres for
 * Oracle later is a one-file change. See the project plan.
 */
async function fetchAirlines() {
  const { data } = await supabaseAdmin.from("airlines").select("code,name,logo_url");
  return new Map((data ?? []).map((a) => [a.code, a]));
}

function mapFlight(f: any, airlines: Map<string, any>): FlightStatusRow {
  const a = airlines.get(f.airline_code);
  return {
    id: f.id,
    flight_number: f.flight_number,
    airline_code: f.airline_code,
    airline_name: a?.name ?? f.airline_code,
    airline_logo: a?.logo_url ?? null,
    aircraft_type: f.aircraft_type,
    source_code: f.source_code,
    destination_code: f.destination_code,
    departure_datetime: f.departure_datetime,
    arrival_datetime: f.arrival_datetime,
    duration_minutes: f.duration_minutes,
    flight_status: f.flight_status,
    gate_number: f.gate_number,
    terminal: f.terminal,
    delay_minutes: f.delay_minutes ?? 0,
    delay_reason: f.delay_reason,
    actual_departure_time: f.actual_departure_time,
  };
}

export const listAirportFlights = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        code: z.string().length(3),
        query: z.string().trim().max(120).optional(),
        scope: z.enum(["upcoming", "past"]).default("upcoming"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const code = data.code.toUpperCase();
    const now = new Date();
    const horizon = new Date(now.getTime() + 36 * 60 * 60 * 1000); // next 36h
    const pastFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let q = supabaseAdmin
      .from("flights")
      .select("*")
      .eq("source_code", code)
      .limit(200);

    if (data.scope === "upcoming") {
      q = q
        .gte("departure_datetime", now.toISOString())
        .lte("departure_datetime", horizon.toISOString())
        .order("departure_datetime", { ascending: true });
    } else {
      q = q
        .gte("departure_datetime", pastFrom.toISOString())
        .lt("departure_datetime", now.toISOString())
        .order("departure_datetime", { ascending: false });
    }

    if (data.query) {
      q = q.ilike("flight_number", `%${data.query}%`);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const airlines = await fetchAirlines();
    return { flights: (rows ?? []).map((f) => mapFlight(f, airlines)) };
  });

export const findFlightByReference = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        flightNumber: z.string().trim().min(2).max(20).optional(),
        bookingId: z.string().trim().min(4).max(80).optional(),
        email: z.string().email().optional(),
      })
      .refine((v) => v.flightNumber || v.bookingId || v.email, {
        message: "Provide a flight number, booking ID, or email",
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const airlines = await fetchAirlines();

    if (data.flightNumber) {
      const { data: rows } = await supabaseAdmin
        .from("flights")
        .select("*")
        .ilike("flight_number", data.flightNumber.trim())
        .order("departure_datetime", { ascending: true })
        .limit(20);
      return { flights: (rows ?? []).map((f) => mapFlight(f, airlines)) };
    }

    // Booking ID / email → look up bookings → flights
    let bq = supabaseAdmin.from("bookings").select("flight_id");
    if (data.bookingId) bq = bq.eq("booking_id", data.bookingId.trim());
    if (data.email) bq = bq.eq("email", data.email.trim());
    const { data: bookings } = await bq.limit(20);
    const ids = Array.from(new Set((bookings ?? []).map((b) => b.flight_id)));
    if (ids.length === 0) return { flights: [] };

    const { data: rows } = await supabaseAdmin
      .from("flights")
      .select("*")
      .in("id", ids)
      .order("departure_datetime", { ascending: true });
    return { flights: (rows ?? []).map((f) => mapFlight(f, airlines)) };
  });

export const ensureGateForFlight = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ flightId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    // Pull flight; only assign once we're within 60 minutes of departure.
    const { data: flight, error: fe } = await supabaseAdmin
      .from("flights")
      .select("id,departure_datetime,gate_number,terminal,source_code,flight_number")
      .eq("id", data.flightId)
      .maybeSingle();
    if (fe || !flight) throw new Error("Flight not found");

    if (flight.gate_number && flight.terminal) {
      return { gate: flight.gate_number, terminal: flight.terminal };
    }

    const minsToDep =
      (new Date(flight.departure_datetime).getTime() - Date.now()) / 60000;
    if (minsToDep > 60) {
      return { gate: null, terminal: null, reason: "too-early" as const };
    }

    const { data: assigned, error } = await supabaseAdmin.rpc(
      "assign_gate_for_flight",
      { p_flight_id: data.flightId },
    );
    if (error) throw new Error(error.message);
    const row = Array.isArray(assigned) ? assigned[0] : assigned;
    return { gate: row?.gate_number ?? null, terminal: row?.terminal ?? null };
  });
