import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin role required");
}

export const getAdminDashboardKpis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setUTCHours(23, 59, 59, 999);

    const [airports, flightsToday, gates, gateAssigns, bookingsToday, cancelled] = await Promise.all([
      supabaseAdmin.from("airports").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.from("flights").select("id,flight_status", { count: "exact" })
        .gte("departure_datetime", todayStart.toISOString())
        .lte("departure_datetime", todayEnd.toISOString()),
      supabaseAdmin.from("gates").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.from("flight_gate_assignments").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.from("bookings").select("total_amount,booking_status")
        .gte("created_at", todayStart.toISOString()),
      supabaseAdmin.from("flights").select("id", { count: "exact", head: true })
        .eq("flight_status", "Cancelled")
        .gte("departure_datetime", todayStart.toISOString())
        .lte("departure_datetime", todayEnd.toISOString()),
    ]);

    const fs = flightsToday.data ?? [];
    const delayed = fs.filter((f) => f.flight_status === "Delayed").length;
    const bks = (bookingsToday.data ?? []).filter((b) => b.booking_status !== "Cancelled");
    const revenue = bks.reduce((s, b) => s + Number(b.total_amount || 0), 0);

    return {
      activeAirports: airports.count ?? 0,
      flightsToday: flightsToday.count ?? 0,
      delayedFlights: delayed,
      gatesTotal: gates.count ?? 0,
      gatesInUse: gateAssigns.count ?? 0,
      bookingsToday: bks.length,
      revenueToday: revenue,
      cancelledToday: cancelled.count ?? 0,
    };
  });

export const getAirportOpsSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ code: z.string().length(3) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const code = data.code.toUpperCase();
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setUTCHours(23, 59, 59, 999);

    const [airport, flights, gates, gateAssigns] = await Promise.all([
      supabaseAdmin.from("airports").select("*").eq("iata_code", code).maybeSingle(),
      supabaseAdmin.from("flights").select("id,flight_status")
        .eq("source_code", code)
        .gte("departure_datetime", todayStart.toISOString())
        .lte("departure_datetime", todayEnd.toISOString()),
      supabaseAdmin.from("gates").select("id", { count: "exact", head: true })
        .eq("airport_code", code).eq("is_active", true),
      supabaseAdmin.from("flight_gate_assignments").select("id", { count: "exact", head: true })
        .eq("airport_code", code).eq("is_active", true),
    ]);

    const fs = flights.data ?? [];
    return {
      airport: airport.data ?? null,
      flightsToday: fs.length,
      delayed: fs.filter((f) => f.flight_status === "Delayed").length,
      cancelled: fs.filter((f) => f.flight_status === "Cancelled").length,
      gatesTotal: gates.count ?? 0,
      gatesInUse: gateAssigns.count ?? 0,
    };
  });
