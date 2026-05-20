import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listAirportFlightsByDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ airportCode: z.string().length(3), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const start = new Date(data.date + "T00:00:00Z").toISOString();
    const end = new Date(new Date(data.date + "T00:00:00Z").getTime() + 86400000).toISOString();

    const [flightsRes, bookingsCountRes] = await Promise.all([
      supabaseAdmin
        .from("flights")
        .select("*")
        .or(`source_code.eq.${data.airportCode},destination_code.eq.${data.airportCode}`)
        .gte("departure_datetime", start)
        .lt("departure_datetime", end)
        .order("departure_datetime", { ascending: true }),
      supabaseAdmin
        .from("bookings")
        .select("flight_id, booking_status"),
    ]);
    if (flightsRes.error) throw new Error(flightsRes.error.message);

    const bookingsByFlight = new Map<string, number>();
    for (const b of bookingsCountRes.data ?? []) {
      if (b.booking_status === "Confirmed") {
        bookingsByFlight.set(b.flight_id, (bookingsByFlight.get(b.flight_id) ?? 0) + 1);
      }
    }
    return (flightsRes.data ?? []).map((f) => ({ ...f, passengers_confirmed: bookingsByFlight.get(f.id) ?? 0 }));
  });

export const getFlightDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ flightId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: flight, error } = await supabaseAdmin
      .from("flights").select("*").eq("id", data.flightId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!flight) throw new Error("Flight not found");

    const { count } = await supabaseAdmin
      .from("bookings")
      .select("booking_id", { count: "exact", head: true })
      .eq("flight_id", data.flightId)
      .eq("booking_status", "Confirmed");

    return { flight, passengers_confirmed: count ?? 0 };
  });

export const delayFlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ flightId: z.string().uuid(), delayMinutes: z.number().int().min(1).max(999), reason: z.string().min(1).max(500) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await context.supabase.rpc("admin_delay_flight", {
      p_flight_id: data.flightId,
      p_delay_minutes: data.delayMinutes,
      p_reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelFlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ flightId: z.string().uuid(), reason: z.string().min(1).max(500) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await context.supabase.rpc("admin_cancel_flight", {
      p_flight_id: data.flightId,
      p_reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changeFlightGate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ flightId: z.string().uuid(), terminal: z.string().min(1).max(20), gate: z.string().min(1).max(20) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: flight, error: flightError } = await supabaseAdmin
      .from("flights")
      .select("*")
      .eq("id", data.flightId)
      .maybeSingle();
    if (flightError) throw new Error(flightError.message);
    if (!flight) throw new Error("Flight not found");

    const { data: gateRow, error: gateError } = await supabaseAdmin
      .from("gates")
      .select("id")
      .eq("airport_code", flight.source_code)
      .eq("terminal", data.terminal)
      .eq("gate_number", data.gate)
      .eq("is_active", true)
      .maybeSingle();
    if (gateError) throw new Error(gateError.message);
    if (!gateRow) throw new Error(`Gate ${data.gate} at terminal ${data.terminal} not found for airport ${flight.source_code}`);

    const departureAt = new Date(flight.departure_datetime).getTime();
    const blockedUntil = new Date(flight.arrival_datetime ?? departureAt + flight.duration_minutes * 60000);
    blockedUntil.setMinutes(blockedUntil.getMinutes() + 15);

    const { data: activeAssignments, error: assignmentError } = await supabaseAdmin
      .from("flight_gate_assignments")
      .select("flight_id, gate_blocked_until")
      .eq("gate_id", gateRow.id)
      .eq("is_active", true)
      .neq("flight_id", data.flightId)
      .gt("gate_blocked_until", flight.departure_datetime);
    if (assignmentError) throw new Error(assignmentError.message);

    const conflictingFlightIds = (activeAssignments ?? []).map((assignment) => assignment.flight_id);
    if (conflictingFlightIds.length > 0) {
      const { data: conflicts, error: conflictError } = await supabaseAdmin
        .from("flights")
        .select("id")
        .in("id", conflictingFlightIds)
        .lt("departure_datetime", blockedUntil.toISOString())
        .limit(1);
      if (conflictError) throw new Error(conflictError.message);
      if ((conflicts ?? []).length > 0) throw new Error(`Gate ${data.gate} conflicts with another flight in this time window`);
    }

    const oldTerminal = flight.terminal;
    const oldGate = flight.gate_number;
    await supabaseAdmin.from("flight_gate_assignments").update({ is_active: false }).eq("flight_id", data.flightId).eq("is_active", true);
    const { error: insertError } = await supabaseAdmin.from("flight_gate_assignments").insert({
      flight_id: data.flightId,
      gate_id: gateRow.id,
      airport_code: flight.source_code,
      terminal: data.terminal,
      gate_number: data.gate,
      gate_blocked_until: blockedUntil.toISOString(),
    });
    if (insertError) throw new Error(insertError.message);

    const { error: updateError } = await supabaseAdmin.from("flights").update({ gate_number: data.gate, terminal: data.terminal }).eq("id", data.flightId);
    if (updateError) throw new Error(updateError.message);

    await supabaseAdmin.from("boarding_passes").update({
      gate_number: data.gate,
      is_updated: true,
      update_reason: `GATE_CHANGE: ${oldGate ?? "TBD"} → ${data.gate}`,
    }).eq("flight_id", data.flightId).eq("is_valid", true);
    await supabaseAdmin.from("admin_actions").insert({
      admin_id: context.userId,
      action_type: "CHANGE_GATE",
      target_table: "flights",
      target_id: data.flightId,
      previous_value: { terminal: oldTerminal, gate: oldGate },
      new_value: { terminal: data.terminal, gate: data.gate },
    });
    return { ok: true };
  });

const ALLOWED_STATUSES = ["Scheduled", "Check-in", "Boarding", "Active", "Departed", "Arrived", "Delayed", "Cancelled"] as const;

export const changeFlightStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ flightId: z.string().uuid(), newStatus: z.enum(ALLOWED_STATUSES), reason: z.string().max(500).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: cur, error: e1 } = await supabaseAdmin
      .from("flights").select("flight_status").eq("id", data.flightId).maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!cur) throw new Error("Flight not found");
    const prev = cur.flight_status;

    const { error: e2 } = await supabaseAdmin
      .from("flights").update({ flight_status: data.newStatus }).eq("id", data.flightId);
    if (e2) throw new Error(e2.message);

    await supabaseAdmin.from("flight_status_history").insert({
      flight_id: data.flightId, previous_status: prev, current_status: data.newStatus,
      reason: data.reason ?? null, changed_by: context.userId,
    });
    await supabaseAdmin.from("admin_actions").insert({
      admin_id: context.userId, action_type: "CHANGE_STATUS", target_table: "flights",
      target_id: data.flightId, previous_value: { status: prev }, new_value: { status: data.newStatus },
      reason: data.reason ?? null,
    });
    return { ok: true };
  });

export const listGatesForAirport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ airportCode: z.string().length(3) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: gates, error } = await supabaseAdmin
      .from("gates").select("id, terminal, gate_number, is_active")
      .eq("airport_code", data.airportCode).eq("is_active", true)
      .order("terminal").order("gate_number");
    if (error) throw new Error(error.message);
    return gates ?? [];
  });

export const createFlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    flight_number: z.string().min(2).max(20),
    airline_code: z.string().min(1).max(10),
    aircraft_type: z.string().min(1).max(50),
    source_code: z.string().length(3),
    destination_code: z.string().length(3),
    departure_datetime: z.string(),
    duration_minutes: z.number().int().min(15).max(2000),
    number_of_stops: z.number().int().min(0).max(5).default(0),
    economy_price: z.number().positive(),
    premium_economy_price: z.number().positive().optional(),
    business_price: z.number().positive().optional(),
    first_class_price: z.number().positive().optional(),
    terminal: z.string().min(1).max(20).optional(),
    gate_number: z.string().min(1).max(20).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.source_code === data.destination_code) throw new Error("Source and destination must differ");

    const dep = new Date(data.departure_datetime);
    const arr = new Date(dep.getTime() + data.duration_minutes * 60000);

    const { data: dup } = await supabaseAdmin
      .from("flights").select("id").eq("flight_number", data.flight_number)
      .eq("departure_datetime", dep.toISOString()).maybeSingle();
    if (dup) throw new Error(`Flight ${data.flight_number} already exists at this departure time`);

    const economy = data.economy_price;
    const insert = {
      flight_number: data.flight_number,
      airline_code: data.airline_code,
      aircraft_type: data.aircraft_type,
      source_code: data.source_code,
      destination_code: data.destination_code,
      departure_datetime: dep.toISOString(),
      arrival_datetime: arr.toISOString(),
      duration_minutes: data.duration_minutes,
      number_of_stops: data.number_of_stops,
      economy_price: economy,
      premium_economy_price: data.premium_economy_price ?? Math.round(economy * 1.5),
      business_price: data.business_price ?? Math.round(economy * 2.5),
      first_class_price: data.first_class_price ?? Math.round(economy * 3.5),
      flight_status: "Scheduled",
      terminal: data.terminal ?? null,
      gate_number: data.gate_number ?? null,
      is_active: true,
      is_visible_on_ui: true,
    };
    const { data: row, error } = await supabaseAdmin
      .from("flights").insert(insert).select("id").single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_actions").insert({
      admin_id: context.userId, action_type: "CREATE_FLIGHT", target_table: "flights",
      target_id: row.id, new_value: { flight_number: data.flight_number, source: data.source_code, destination: data.destination_code },
    });
    return { id: row.id };
  });
