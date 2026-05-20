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
