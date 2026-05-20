import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CabinClass = "Economy" | "Premium Economy" | "Business" | "First Class";

export type FlightRow = {
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
  number_of_stops: number;
  economy_price: number;
  premium_economy_price: number;
  business_price: number;
  first_class_price: number;
  flight_status: string;
  gate_number: string | null;
};

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const searchFlights = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        source: z.string().length(3).optional(),
        destination: z.string().length(3).optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        airline: z.string().optional(),
        cabinClass: z.enum(["Economy", "Premium Economy", "Business", "First Class"]).optional(),
        maxPrice: z.number().positive().optional(),
        sortBy: z.enum(["price", "duration", "departure"]).default("departure"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const minDep = new Date(Date.now() + TWENTY_FOUR_HOURS_MS);

    let q = supabaseAdmin
      .from("flights")
      .select("*")
      .eq("is_visible_on_ui", true)
      .gte("departure_datetime", minDep.toISOString())
      .limit(500);

    if (data.source) q = q.eq("source_code", data.source.toUpperCase());
    if (data.destination) q = q.eq("destination_code", data.destination.toUpperCase());
    if (data.airline) q = q.eq("airline_code", data.airline);
    if (data.date) {
      const dayStart = new Date(`${data.date}T00:00:00Z`);
      const dayEnd = new Date(`${data.date}T23:59:59Z`);
      const lower = dayStart > minDep ? dayStart : minDep;
      q = q.gte("departure_datetime", lower.toISOString()).lte("departure_datetime", dayEnd.toISOString());
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const { data: airlines } = await supabaseAdmin.from("airlines").select("code,name,logo_url");
    const airlineMap = new Map((airlines ?? []).map((a) => [a.code, a]));

    let results: FlightRow[] = (rows ?? []).map((f) => {
      const a = airlineMap.get(f.airline_code);
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
        number_of_stops: f.number_of_stops,
        economy_price: Number(f.economy_price),
        premium_economy_price: Number(f.premium_economy_price),
        business_price: Number(f.business_price),
        first_class_price: Number(f.first_class_price),
        flight_status: f.flight_status,
        gate_number: f.gate_number,
      };
    });

    if (data.maxPrice) {
      const cls = data.cabinClass ?? "Economy";
      const key =
        cls === "Economy"
          ? "economy_price"
          : cls === "Premium Economy"
            ? "premium_economy_price"
            : cls === "Business"
              ? "business_price"
              : "first_class_price";
      results = results.filter((r) => r[key as keyof FlightRow] as number <= data.maxPrice!);
    }

    results.sort((a, b) => {
      if (data.sortBy === "price") return a.economy_price - b.economy_price;
      if (data.sortBy === "duration") return a.duration_minutes - b.duration_minutes;
      return a.departure_datetime.localeCompare(b.departure_datetime);
    });

    return { flights: results.slice(0, 200) };
  });

export const getDestinationsForSource = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ source: z.string().length(3) }).parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("airport_routes")
      .select("destination_code,distance_km,duration_minutes")
      .eq("source_code", data.source.toUpperCase());
    if (error) throw new Error(error.message);

    const codes = (rows ?? []).map((r) => r.destination_code);
    const { data: airports } = await supabaseAdmin
      .from("airports")
      .select("iata_code,city,airport_name")
      .in("iata_code", codes.length ? codes : ["__none__"]);
    const map = new Map((airports ?? []).map((a) => [a.iata_code, a]));
    return {
      destinations: (rows ?? []).map((r) => ({
        code: r.destination_code,
        city: map.get(r.destination_code)?.city ?? r.destination_code,
        airport_name: map.get(r.destination_code)?.airport_name ?? "",
        distance_km: r.distance_km,
        duration_minutes: r.duration_minutes,
      })),
    };
  });

export const getFlightById = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ flightId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: f, error } = await supabaseAdmin
      .from("flights")
      .select("*")
      .eq("id", data.flightId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!f) throw new Error("Flight not found");
    const { data: a } = await supabaseAdmin
      .from("airlines")
      .select("code,name,logo_url")
      .eq("code", f.airline_code)
      .maybeSingle();
    return {
      flight: {
        ...f,
        economy_price: Number(f.economy_price),
        premium_economy_price: Number(f.premium_economy_price),
        business_price: Number(f.business_price),
        first_class_price: Number(f.first_class_price),
        airline_name: a?.name ?? f.airline_code,
        airline_logo: a?.logo_url ?? null,
      },
    };
  });

function genBookingId(airlineCode: string, email: string) {
  const date = new Date();
  const ymd = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.floor(100000 + Math.random() * 900000);
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  const hash = h.toString(36).toUpperCase().slice(0, 6).padEnd(6, "X");
  return `${airlineCode}-${ymd}-${rand}-${hash}`;
}

function seatForClass(cls: CabinClass) {
  const row =
    cls === "First Class"
      ? Math.floor(Math.random() * 2) + 1
      : cls === "Business"
        ? Math.floor(Math.random() * 4) + 3
        : cls === "Premium Economy"
          ? Math.floor(Math.random() * 4) + 7
          : Math.floor(Math.random() * 20) + 11;
  const letter = "ABCDEF"[Math.floor(Math.random() * 6)];
  return `${row}${letter}`;
}

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        flightId: z.string().uuid(),
        passengerName: z.string().min(2).max(100),
        passengerAge: z.number().int().min(1).max(120),
        passengerPhone: z.string().min(7).max(20),
        passengerPassportId: z.string().min(4).max(30),
        email: z.string().email(),
        cabinClass: z.enum(["Economy", "Premium Economy", "Business", "First Class"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: f, error: fe } = await supabaseAdmin
      .from("flights")
      .select("*")
      .eq("id", data.flightId)
      .maybeSingle();
    if (fe || !f) throw new Error("Flight not found");

    const priceMap: Record<CabinClass, number> = {
      Economy: Number(f.economy_price),
      "Premium Economy": Number(f.premium_economy_price),
      Business: Number(f.business_price),
      "First Class": Number(f.first_class_price),
    };
    const total = priceMap[data.cabinClass];

    const bookingId = genBookingId(f.airline_code, data.email);
    const seat = seatForClass(data.cabinClass);

    const { error: be } = await supabase.from("bookings").insert({
      user_id: userId,
      flight_id: data.flightId,
      booking_id: bookingId,
      email: data.email,
      passenger_name: data.passengerName,
      passenger_age: data.passengerAge,
      passenger_phone: data.passengerPhone,
      passenger_passport_id: data.passengerPassportId,
      cabin_class: data.cabinClass,
      seat_number: seat,
      total_amount: total,
    });
    if (be) throw new Error(be.message);

    return { bookingId };
  });

export const getMyBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const flightIds = (bookings ?? []).map((b) => b.flight_id);
    const { data: flights } = await supabaseAdmin
      .from("flights")
      .select("*")
      .in("id", flightIds.length ? flightIds : ["00000000-0000-0000-0000-000000000000"]);
    const fmap = new Map((flights ?? []).map((f) => [f.id, f]));
    const { data: airlines } = await supabaseAdmin.from("airlines").select("code,name,logo_url");
    const amap = new Map((airlines ?? []).map((a) => [a.code, a]));

    return {
      bookings: (bookings ?? []).map((b) => {
        const f = fmap.get(b.flight_id);
        const a = f ? amap.get(f.airline_code) : null;
        return {
          ...b,
          total_amount: Number(b.total_amount),
          flight: f
            ? {
                ...f,
                airline_name: a?.name ?? f.airline_code,
                airline_logo: a?.logo_url ?? null,
              }
            : null,
        };
      }),
    };
  });

export const getBoardingPass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ bookingId: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: bp, error } = await supabase
      .from("boarding_passes")
      .select("*")
      .eq("booking_id", data.bookingId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!bp) throw new Error("Boarding pass not found");

    const { data: f } = await supabaseAdmin.from("flights").select("*").eq("id", bp.flight_id).maybeSingle();
    const { data: a } = f
      ? await supabaseAdmin.from("airlines").select("code,name,logo_url").eq("code", f.airline_code).maybeSingle()
      : { data: null };

    return {
      boardingPass: bp,
      flight: f ? { ...f, airline_name: a?.name ?? f.airline_code, airline_logo: a?.logo_url ?? null } : null,
    };
  });
