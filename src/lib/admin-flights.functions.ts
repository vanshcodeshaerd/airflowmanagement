import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role")
    .eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listAirportFlightsByDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    code: z.string().length(3),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const code = data.code.toUpperCase();
    const dayStart = new Date(`${data.date}T00:00:00Z`);
    const dayEnd = new Date(`${data.date}T23:59:59Z`);

    const { data: flights, error } = await supabaseAdmin
      .from("flights").select("*")
      .eq("source_code", code)
      .gte("departure_datetime", dayStart.toISOString())
      .lte("departure_datetime", dayEnd.toISOString())
      .order("departure_datetime", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = (flights ?? []).map((f) => f.id);
    const { data: bookings } = await supabaseAdmin
      .from("bookings").select("flight_id,booking_status")
      .in("flight_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const counts = new Map<string, number>();
    (bookings ?? []).forEach((b) => {
      if (b.booking_status !== "Cancelled") {
        counts.set(b.flight_id, (counts.get(b.flight_id) ?? 0) + 1);
      }
    });

    const { data: airlines } = await supabaseAdmin.from("airlines").select("code,name,logo_url");
    const amap = new Map((airlines ?? []).map((a) => [a.code, a]));

    return {
      flights: (flights ?? []).map((f) => ({
        ...f,
        airline_name: amap.get(f.airline_code)?.name ?? f.airline_code,
        airline_logo: amap.get(f.airline_code)?.logo_url ?? null,
        passengers_count: counts.get(f.id) ?? 0,
      })),
    };
  });

export const delayFlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    flightId: z.string().uuid(),
    delayMinutes: z.number().int().min(1).max(720),
    reason: z.string().min(2).max(200),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.rpc("admin_delay_flight", {
      p_flight_id: data.flightId,
      p_delay_minutes: data.delayMinutes,
      p_reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelFlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    flightId: z.string().uuid(),
    reason: z.string().min(2).max(200),
    confirm: z.literal("CANCEL"),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.rpc("admin_cancel_flight", {
      p_flight_id: data.flightId,
      p_reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changeFlightStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    flightId: z.string().uuid(),
    status: z.enum(["Scheduled", "Delayed", "Boarding", "Departed", "Cancelled", "Arrived"]),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: prev } = await supabaseAdmin.from("flights")
      .select("flight_status").eq("id", data.flightId).maybeSingle();
    const { error } = await supabaseAdmin.from("flights")
      .update({ flight_status: data.status }).eq("id", data.flightId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("flight_status_history").insert({
      flight_id: data.flightId,
      previous_status: prev?.flight_status ?? null,
      current_status: data.status,
      changed_by: context.userId,
    });
    await supabaseAdmin.from("admin_actions").insert({
      admin_id: context.userId, action_type: "STATUS_CHANGE",
      target_entity: "flights", target_id: data.flightId,
      previous_value: { status: prev?.flight_status }, new_value: { status: data.status },
    });
    return { ok: true };
  });

export const listGatesForAirport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ code: z.string().length(3) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: gates } = await supabaseAdmin.from("gates")
      .select("*").eq("airport_code", data.code.toUpperCase()).eq("is_active", true)
      .order("terminal").order("gate_number");
    return { gates: gates ?? [] };
  });

export const changeFlightGate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    flightId: z.string().uuid(), gateId: z.string().uuid(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: res, error } = await supabaseAdmin.rpc("admin_change_gate", {
      p_flight_id: data.flightId, p_new_gate_id: data.gateId,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(res) ? res[0] : res;
    return { gate: row?.gate_number ?? null, terminal: row?.terminal ?? null };
  });
