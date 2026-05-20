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

const BOOKING_STATUSES = ["Confirmed", "Checked-In", "Boarded", "NoShow", "Cancelled"] as const;

export const listAllUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [{ data: profiles }, { data: bookings }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,full_name,created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("bookings").select("user_id,total_amount,booking_status"),
    ]);
    const counts = new Map<string, { trips: number; spent: number }>();
    (bookings ?? []).forEach((b) => {
      const c = counts.get(b.user_id) ?? { trips: 0, spent: 0 };
      if (b.booking_status !== "Cancelled") {
        c.trips += 1; c.spent += Number(b.total_amount || 0);
      }
      counts.set(b.user_id, c);
    });
    return {
      users: (profiles ?? []).map((p) => ({
        id: p.id, full_name: p.full_name, joined_at: p.created_at,
        trips: counts.get(p.id)?.trips ?? 0,
        total_spent: counts.get(p.id)?.spent ?? 0,
      })),
    };
  });

export const listTodaysPassengers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const start = new Date(); start.setUTCHours(0,0,0,0);
    const end = new Date(); end.setUTCHours(23,59,59,999);
    const { data: flights } = await supabaseAdmin.from("flights")
      .select("id,flight_number,source_code,destination_code,departure_datetime,flight_status")
      .gte("departure_datetime", start.toISOString())
      .lte("departure_datetime", end.toISOString());
    const ids = (flights ?? []).map((f) => f.id);
    const { data: bookings } = await supabaseAdmin.from("bookings")
      .select("booking_id,flight_id,passenger_name,seat_number,cabin_class,booking_status,user_id,email,passenger_phone")
      .in("flight_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
      .order("created_at", { ascending: false });
    const fmap = new Map((flights ?? []).map((f) => [f.id, f]));
    return {
      passengers: (bookings ?? []).map((b) => ({
        ...b, flight: fmap.get(b.flight_id) ?? null,
      })),
    };
  });

export const listFlightPassengers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ flightId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: flight } = await supabaseAdmin.from("flights").select("*").eq("id", data.flightId).maybeSingle();
    const { data: bookings } = await supabaseAdmin.from("bookings")
      .select("booking_id,passenger_name,seat_number,cabin_class,booking_status,email,passenger_phone,passenger_age,user_id,total_amount")
      .eq("flight_id", data.flightId).order("seat_number");
    return { flight, passengers: bookings ?? [] };
  });

const bookingIdSchema = z.object({ bookingRowId: z.string().min(1) });


export const forceCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => bookingIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("bookings")
      .update({ booking_status: "Checked-In" }).eq("id", data.bookingRowId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_actions").insert({
      admin_id: context.userId, action_type: "FORCE_CHECKIN",
      target_entity: "bookings", target_id: data.bookingRowId,
      new_value: { booking_status: "Checked-In" },
    });
    return { ok: true };
  });

export const markBoarded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => bookingIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("bookings")
      .update({ booking_status: "Boarded" }).eq("id", data.bookingRowId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_actions").insert({
      admin_id: context.userId, action_type: "MARK_BOARDED",
      target_entity: "bookings", target_id: data.bookingRowId,
      new_value: { booking_status: "Boarded" },
    });
    return { ok: true };
  });

export const markNoShow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => bookingIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("bookings")
      .update({ booking_status: "NoShow" }).eq("id", data.bookingRowId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_actions").insert({
      admin_id: context.userId, action_type: "MARK_NOSHOW",
      target_entity: "bookings", target_id: data.bookingRowId,
      new_value: { booking_status: "NoShow" },
    });
    return { ok: true };
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    bookingRowId: z.string().uuid(),
    reason: z.string().min(2).max(200),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: b } = await supabaseAdmin.from("bookings")
      .select("booking_id,user_id,total_amount,flight_id").eq("id", data.bookingRowId).maybeSingle();
    if (!b) throw new Error("Booking not found");
    const { error } = await supabaseAdmin.from("bookings")
      .update({ booking_status: "Cancelled", cancellation_reason: data.reason, cancelled_at: new Date().toISOString() })
      .eq("id", data.bookingRowId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("boarding_passes")
      .update({ is_valid: false, invalidation_reason: data.reason })
      .eq("booking_id", b.booking_id);
    await supabaseAdmin.from("refund_records").insert({
      booking_id: b.booking_id, user_id: b.user_id,
      refund_amount: b.total_amount, refund_reason: data.reason,
      refund_type: "FULL_REFUND", status: "Pending", initiated_by: context.userId,
    });
    await supabaseAdmin.from("passenger_notifications").insert({
      user_id: b.user_id, booking_id: b.booking_id, flight_id: b.flight_id,
      notification_type: "BOOKING_CANCEL",
      title: "Booking cancelled by admin",
      message: `Your booking ${b.booking_id} has been cancelled. Reason: ${data.reason}. A refund of ₹${b.total_amount} will be processed.`,
    });
    await supabaseAdmin.from("admin_actions").insert({
      admin_id: context.userId, action_type: "BOOKING_CANCEL",
      target_entity: "bookings", target_id: data.bookingRowId,
      reason: data.reason, new_value: { booking_status: "Cancelled" },
    });
    return { ok: true };
  });

export { BOOKING_STATUSES };
