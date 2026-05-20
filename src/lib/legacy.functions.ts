import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error((error as { message: string }).message);
  if (!data) throw new Error("Forbidden: admin role required");
}

// Read-only access to the original Oracle-shape tables (LOCATION, PASSENGER,
// PAYMENT, REFUND_INFO, BAGGAGE, CHECK_IN, FLIGHT_STOPS, AIRCRAFT_MODEL,
// TERMINAL). These mirror the source-of-truth DDL/DML. They are additive —
// the existing app continues to use `airports`, `flights`, `bookings`, etc.

const ok = <T,>(rows: T | null) => rows ?? ([] as unknown as T);

export const listOriginalPassengers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("passenger" as never)
      .select("*")
      .order("ticket_number");
    if (error) throw new Error(error.message);
    return ok(data);
  });

export const listOriginalPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payment" as never)
      .select("*")
      .order("payment_id");
    if (error) throw new Error(error.message);
    return ok(data);
  });

export const listOriginalBaggage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("baggage" as never)
      .select("*")
      .order("tag_id");
    if (error) throw new Error(error.message);
    return ok(data);
  });

export const listOriginalCheckIns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("check_in" as never)
      .select("*")
      .order("checkin_id");
    if (error) throw new Error(error.message);
    return ok(data);
  });

export const listOriginalFlightStops = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("flight_stops" as never)
      .select("*")
      .order("flight_number");
    if (error) throw new Error(error.message);
    return ok(data);
  });

export const listOriginalLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("location" as never)
      .select("*")
      .order("location_id");
    if (error) throw new Error(error.message);
    return ok(data);
  });

export const listOriginalAircraftModels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("aircraft_model" as never)
      .select("*")
      .order("model_id");
    if (error) throw new Error(error.message);
    return ok(data);
  });

export const listOriginalTerminals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("terminal" as never)
      .select("*")
      .order("terminal_number");
    if (error) throw new Error(error.message);
    return ok(data);
  });

// ============= Admin write functions =============

export const updatePaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    payment_id: z.string().min(1),
    payment_status: z.enum(["Successful", "Failed", "Refunded", "Pending"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await (context.supabase as never as { from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: unknown }> } } })
      .from("payment").update({ payment_status: data.payment_status, updated_at: new Date().toISOString() }).eq("payment_id", data.payment_id);
    if (error) throw new Error((error as { message: string }).message);
    return { ok: true };
  });

export const updateBaggageStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    tag_id: z.string().min(1),
    baggage_status: z.enum(["Checked-in", "Loaded", "In-transit", "Arrived", "Claimed", "Lost"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await (context.supabase as never as { from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: unknown }> } } })
      .from("baggage").update({ baggage_status: data.baggage_status }).eq("tag_id", data.tag_id);
    if (error) throw new Error((error as { message: string }).message);
    return { ok: true };
  });

export const updateCheckInStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    checkin_id: z.string().min(1),
    checkin_status: z.enum(["Checked-in", "Pending", "Cancelled", "No-show"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await (context.supabase as never as { from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: unknown }> } } })
      .from("check_in").update({ checkin_status: data.checkin_status }).eq("checkin_id", data.checkin_id);
    if (error) throw new Error((error as { message: string }).message);
    return { ok: true };
  });

export const updatePassengerContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    ticket_number: z.string().min(1),
    contact_info: z.string().max(200).optional(),
    email: z.string().email().max(200).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const patch: Record<string, string> = {};
    if (data.contact_info !== undefined) patch.contact_info = data.contact_info;
    if (data.email !== undefined) patch.email = data.email;
    const { error } = await (context.supabase as never as { from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: unknown }> } } })
      .from("passenger").update(patch).eq("ticket_number", data.ticket_number);
    if (error) throw new Error((error as { message: string }).message);
    return { ok: true };
  });

// ============= Public reads (for user-side flight detail) =============

export const getFlightAircraftAndStops = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ flight_number: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const [flightRes, stopsRes] = await Promise.all([
      supabase.from("flights").select("model_id, airline_code, aircraft_type").eq("flight_number", data.flight_number).maybeSingle(),
      supabase.from("flight_stops" as never).select("*").eq("flight_number", data.flight_number).order("stop_number"),
    ]);
    let aircraft: any = null;
    const modelId = (flightRes.data as { model_id?: string } | null)?.model_id;
    if (modelId) {
      const { data: m } = await supabase.from("aircraft_model" as never).select("*").eq("model_id", modelId).maybeSingle();
      aircraft = m as Record<string, unknown> | null;
    }
    return { aircraft, stops: (stopsRes.data ?? []) as Array<{ stop_number: number; stop_location: string }> };
  });
