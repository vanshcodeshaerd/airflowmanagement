import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

function todayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export const getAdminDashboardKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { start, end } = todayBounds();

    const [flightsRes, bookingsRes, delayedRes, cancelledRes] = await Promise.all([
      supabaseAdmin
        .from("flights")
        .select("id, flight_status, source_code, terminal, gate_number", { count: "exact" })
        .gte("departure_datetime", start)
        .lt("departure_datetime", end),
      supabaseAdmin
        .from("bookings")
        .select("booking_id, total_amount, booking_status, created_at", { count: "exact" })
        .gte("created_at", start)
        .lt("created_at", end),
      supabaseAdmin
        .from("flights")
        .select("id", { count: "exact", head: true })
        .gte("departure_datetime", start)
        .lt("departure_datetime", end)
        .eq("flight_status", "Delayed"),
      supabaseAdmin
        .from("flights")
        .select("id", { count: "exact", head: true })
        .gte("departure_datetime", start)
        .lt("departure_datetime", end)
        .eq("flight_status", "Cancelled"),
    ]);

    const flights = flightsRes.data ?? [];
    const bookings = bookingsRes.data ?? [];

    const statusCounts: Record<string, number> = {};
    for (const f of flights) {
      statusCounts[f.flight_status] = (statusCounts[f.flight_status] ?? 0) + 1;
    }

    const revenue = bookings
      .filter((b) => b.booking_status === "Confirmed")
      .reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0);

    return {
      totalFlights: flightsRes.count ?? 0,
      totalBookings: bookingsRes.count ?? 0,
      delayedCount: delayedRes.count ?? 0,
      cancelledCount: cancelledRes.count ?? 0,
      revenueToday: revenue,
      statusCounts,
    };
  });

export const listRecentAdminActions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("admin_actions")
      .select("id, action_type, target_table, target_id, reason, created_at, new_value")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listRecentBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("booking_id, passenger_name, flight_id, cabin_class, total_amount, booking_status, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
