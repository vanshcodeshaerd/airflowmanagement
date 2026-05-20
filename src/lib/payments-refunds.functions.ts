import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

type SbCtx = {
  supabase: any;
  userId: string;
};

async function assertAdmin(ctx: SbCtx) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

function genTxnId(bookingRef: string) {
  const d = new Date();
  const ts =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0") +
    String(d.getHours()).padStart(2, "0") +
    String(d.getMinutes()).padStart(2, "0") +
    String(d.getSeconds()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900000 + 100000);
  const suffix = bookingRef.replace(/[^A-Z0-9]/gi, "").slice(-6).toUpperCase();
  return `TXN-${ts}-${rand}-${suffix}`;
}

async function nextRefundRequestId(supabase: any) {
  const day =
    new Date().getFullYear().toString() +
    String(new Date().getMonth() + 1).padStart(2, "0") +
    String(new Date().getDate()).padStart(2, "0");
  const { data } = await supabase
    .from("refund_records")
    .select("refund_request_id")
    .like("refund_request_id", `REF-${day}-%`);
  const max = (data ?? []).reduce((m: number, r: any) => {
    const n = parseInt(String(r.refund_request_id).split("-")[2] ?? "0", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `REF-${day}-${String(max + 1).padStart(3, "0")}`;
}

// ============= UPI Payment =============

export const completeUpiPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        booking_id: z.string().min(3),
        user_upi_id: z.string().min(3).max(100).regex(/^[\w.\-]+@[\w.\-]+$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: booking, error: be } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_id", data.booking_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (be) throw new Error(be.message);
    if (!booking) throw new Error("Booking not found");

    const txn = genTxnId(booking.booking_id);
    const paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    const { error: passengerError } = await supabaseAdmin.from("passenger").upsert(
      {
        ticket_number: booking.booking_id,
        passenger_name: booking.passenger_name,
        age: booking.passenger_age,
        contact_info: booking.passenger_phone,
        email: booking.email,
        passport_id: booking.passenger_passport_id,
        user_id: userId,
        is_active: true,
      },
      { onConflict: "ticket_number" },
    );
    if (passengerError) throw new Error(passengerError.message);

    const { error: pe } = await supabaseAdmin.from("payment").insert({
      payment_id: paymentId,
      ticket_number: booking.booking_id,
      booking_id: booking.booking_id,
      amount: booking.total_amount,
      payment_status: "Success",
      payment_method: "UPI",
      transaction_reference: txn,
      user_upi_id: data.user_upi_id,
      gateway_upi_id: "airflow.payments@upi",
      transaction_status: "Success",
    });
    if (pe) throw new Error(pe.message);

    return { transaction_reference: txn, amount: Number(booking.total_amount) };
  });

// ============= Refund (user) =============

export const submitRefundRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email().toLowerCase().max(200),
        booking_id: z.string().min(3).max(100),
        transaction_id: z.string().min(5).max(200),
        reason: z.string().max(255).optional(),
        refund_to_upi: z.string().regex(/^[\w.\-]+@[\w.\-]+$/).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_id", data.booking_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!booking) throw new Error("Invalid Booking ID");
    if (String(booking.email).toLowerCase() !== data.email)
      throw new Error("Email does not match this booking");

    const { data: payment } = await supabase
      .from("payment")
      .select("*")
      .eq("booking_id", data.booking_id)
      .eq("transaction_reference", data.transaction_id)
      .maybeSingle();
    if (!payment) throw new Error("Transaction ID does not match our records");

    const { data: flight } = await supabase
      .from("flights")
      .select("flight_status, flight_number")
      .eq("id", booking.flight_id)
      .maybeSingle();
    const eligible =
      flight && ["Cancelled", "Delayed"].includes(String(flight.flight_status));
    if (!eligible)
      throw new Error("Refunds are only allowed for cancelled or delayed flights");

    const { data: dup } = await supabase
      .from("refund_records")
      .select("id")
      .eq("request_txn_id", data.transaction_id)
      .neq("status", "Rejected");
    if ((dup ?? []).length > 0)
      throw new Error("A refund request already exists for this transaction");

    const refundReqId = await nextRefundRequestId(supabase);

    const { error: re } = await supabase.from("refund_records").insert({
      booking_id: booking.booking_id,
      user_id: userId,
      refund_amount: booking.total_amount,
      status: "Pending",
      refund_reason: data.reason ?? "Passenger refund request",
      refund_type: "Manual",
      requested_by: "USER",
      flight_number: flight?.flight_number,
      flight_id: booking.flight_id,
      request_email: data.email,
      request_booking_id: data.booking_id,
      request_txn_id: data.transaction_id,
      refund_to_upi: data.refund_to_upi,
      is_auto_refund: false,
      refund_request_id: refundReqId,
    });
    if (re) throw new Error(re.message);

    await supabase
      .from("bookings")
      .update({ booking_status: "Refund Requested", refund_ref_id: refundReqId })
      .eq("booking_id", data.booking_id);

    await supabase.from("passenger_notifications").insert({
      user_id: userId,
      booking_id: data.booking_id,
      flight_id: booking.flight_id,
      notification_type: "REFUND_INITIATED",
      title: "Refund request submitted",
      message: `Your refund request ${refundReqId} for ₹${booking.total_amount} has been received. We'll update you within 24 hours.`,
    });

    return {
      refund_request_id: refundReqId,
      amount: Number(booking.total_amount),
      refund_to_upi: data.refund_to_upi,
    };
  });

export const cancelOwnDelayedBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ booking_id: z.string().min(3), reason: z.string().max(255).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_id", data.booking_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!booking) throw new Error("Booking not found");
    if (booking.booking_status !== "Confirmed")
      throw new Error("Booking can no longer be cancelled");

    const { data: flight } = await supabase
      .from("flights")
      .select("flight_status, flight_number")
      .eq("id", booking.flight_id)
      .maybeSingle();
    if (!flight || flight.flight_status !== "Delayed")
      throw new Error("Self-cancel is only available for delayed flights");

    const { data: payment } = await supabase
      .from("payment")
      .select("*")
      .eq("booking_id", data.booking_id)
      .maybeSingle();

    const refundReqId = await nextRefundRequestId(supabase);

    await supabase.from("refund_records").insert({
      booking_id: booking.booking_id,
      user_id: userId,
      refund_amount: booking.total_amount,
      status: "Pending",
      refund_reason: data.reason ?? "Passenger cancelled due to delay",
      refund_type: "Manual",
      requested_by: "USER",
      flight_number: flight.flight_number,
      flight_id: booking.flight_id,
      request_email: booking.email,
      request_booking_id: booking.booking_id,
      request_txn_id: payment?.transaction_reference ?? null,
      refund_to_upi: payment?.user_upi_id ?? null,
      is_auto_refund: false,
      refund_request_id: refundReqId,
    });

    await supabase
      .from("bookings")
      .update({
        booking_status: "Cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: data.reason ?? "Cancelled due to delay",
        refund_ref_id: refundReqId,
      })
      .eq("booking_id", booking.booking_id);

    await supabase.from("passenger_notifications").insert({
      user_id: userId,
      booking_id: booking.booking_id,
      flight_id: booking.flight_id,
      notification_type: "REFUND_INITIATED",
      title: "Booking cancelled — refund initiated",
      message: `Refund ${refundReqId} of ₹${booking.total_amount} has been initiated and will be credited shortly.`,
    });

    return { refund_request_id: refundReqId };
  });

export const listMyRefunds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("refund_records")
      .select("*")
      .eq("user_id", context.userId)
      .eq("is_active", true)
      .order("initiated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { refunds: data ?? [] };
  });

// ============= Notifications =============

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("passenger_notifications")
      .select("*")
      .eq("user_id", context.userId)
      .order("sent_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return {
      notifications: data ?? [],
      unread: (data ?? []).filter((n: any) => !n.is_read).length,
    };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("passenger_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("passenger_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .eq("is_read", false);
    return { ok: true };
  });

// ============= Admin: Refunds =============

export const adminListRefunds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        status: z.enum(["Pending", "Approved", "Rejected", "Completed", "All"]).default("All"),
        auto_only: z.boolean().default(false),
        search: z.string().max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    let q = context.supabase.from("refund_records").select("*").eq("is_active", true);
    if (data.status !== "All") q = q.eq("status", data.status);
    if (data.auto_only) q = q.eq("is_auto_refund", true);
    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(
        `refund_request_id.ilike.${s},request_email.ilike.${s},request_booking_id.ilike.${s},request_txn_id.ilike.${s},flight_number.ilike.${s}`,
      );
    }
    const { data: rows, error } = await q.order("initiated_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);

    // KPI counts
    const { data: kpi } = await context.supabase
      .from("refund_records")
      .select("status, refund_amount, is_auto_refund")
      .eq("is_active", true);
    const counts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      auto: 0,
      totalRefunded: 0,
    };
    for (const r of kpi ?? []) {
      const st = String(r.status);
      if (st === "Pending") counts.pending++;
      else if (st === "Approved") counts.approved++;
      else if (st === "Rejected") counts.rejected++;
      else if (st === "Completed") counts.completed++;
      if (r.is_auto_refund) counts.auto++;
      if (st === "Approved" || st === "Completed")
        counts.totalRefunded += Number(r.refund_amount ?? 0);
    }

    return { refunds: rows ?? [], counts };
  });

export const adminApproveRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        refund_id: z.string().uuid(),
        amount: z.number().positive(),
        admin_notes: z.string().max(500).optional(),
        notify: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { data: refund } = await context.supabase
      .from("refund_records")
      .select("*")
      .eq("id", data.refund_id)
      .maybeSingle();
    if (!refund) throw new Error("Refund not found");

    await context.supabase
      .from("refund_records")
      .update({
        status: "Approved",
        refund_amount: data.amount,
        approved_by: context.userId,
        approved_at: new Date().toISOString(),
        admin_notes: data.admin_notes ?? null,
      })
      .eq("id", data.refund_id);

    if (refund.request_txn_id) {
      await context.supabase
        .from("payment")
        .update({
          payment_status: "Refunded",
          transaction_status: "Refunded",
          updated_at: new Date().toISOString(),
        })
        .eq("transaction_reference", refund.request_txn_id);
    }

    if (data.notify) {
      await context.supabase.from("passenger_notifications").insert({
        user_id: refund.user_id,
        booking_id: refund.booking_id,
        flight_id: refund.flight_id,
        notification_type: "REFUND_APPROVED",
        title: "Refund Approved",
        message: `Your refund of ₹${data.amount} for booking ${refund.booking_id} has been approved and will be credited to ${refund.refund_to_upi ?? "your UPI ID"} within 2-3 business days.`,
      });
    }

    await context.supabase.from("admin_actions").insert({
      admin_id: context.userId,
      action_type: "REFUND_APPROVE",
      target_table: "refund_records",
      target_id: data.refund_id,
      previous_value: { status: refund.status },
      new_value: { status: "Approved", amount: data.amount },
      notes: data.admin_notes ?? null,
    });

    return { ok: true };
  });

export const adminRejectRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        refund_id: z.string().uuid(),
        reason: z.string().min(2).max(255),
        notes: z.string().max(500).optional(),
        notify: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { data: refund } = await context.supabase
      .from("refund_records")
      .select("*")
      .eq("id", data.refund_id)
      .maybeSingle();
    if (!refund) throw new Error("Refund not found");

    await context.supabase
      .from("refund_records")
      .update({
        status: "Rejected",
        rejection_reason: data.reason,
        rejected_at: new Date().toISOString(),
        admin_notes: data.notes ?? null,
      })
      .eq("id", data.refund_id);

    if (data.notify) {
      await context.supabase.from("passenger_notifications").insert({
        user_id: refund.user_id,
        booking_id: refund.booking_id,
        flight_id: refund.flight_id,
        notification_type: "REFUND_REJECTED",
        title: "Refund Request Update",
        message: `Your refund request for booking ${refund.booking_id} could not be processed. Reason: ${data.reason}. Please contact support.`,
      });
    }

    await context.supabase.from("admin_actions").insert({
      admin_id: context.userId,
      action_type: "REFUND_REJECT",
      target_table: "refund_records",
      target_id: data.refund_id,
      previous_value: { status: refund.status },
      new_value: { status: "Rejected", reason: data.reason },
      notes: data.notes ?? null,
    });

    return { ok: true };
  });

export const adminMarkRefundCredited = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ refund_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    await context.supabase
      .from("refund_records")
      .update({ status: "Completed", processed_at: new Date().toISOString() })
      .eq("id", data.refund_id);
    return { ok: true };
  });

export const adminListFlightBookingsForRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ flight_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { data: rows } = await context.supabase
      .from("bookings")
      .select("*")
      .eq("flight_id", data.flight_id)
      .eq("booking_status", "Confirmed");
    const bids = (rows ?? []).map((b: any) => b.booking_id);
    const { data: pays } = bids.length
      ? await context.supabase.from("payment").select("*").in("booking_id", bids)
      : { data: [] };
    const payMap = new Map((pays ?? []).map((p: any) => [p.booking_id, p]));
    return {
      bookings: (rows ?? []).map((b: any) => ({
        booking_id: b.booking_id,
        passenger_name: b.passenger_name,
        email: b.email,
        amount: Number(b.total_amount),
        transaction_reference: (payMap.get(b.booking_id) as any)?.transaction_reference ?? null,
        user_upi_id: (payMap.get(b.booking_id) as any)?.user_upi_id ?? null,
      })),
    };
  });

export const adminBulkRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        flight_id: z.string().uuid(),
        booking_ids: z.array(z.string()).min(1),
        reason: z.string().max(255),
        notes: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { data: flight } = await context.supabase
      .from("flights")
      .select("flight_number")
      .eq("id", data.flight_id)
      .maybeSingle();
    if (!flight) throw new Error("Flight not found");

    const { data: bookings } = await context.supabase
      .from("bookings")
      .select("*")
      .in("booking_id", data.booking_ids);
    const { data: pays } = await context.supabase
      .from("payment")
      .select("*")
      .in("booking_id", data.booking_ids);
    const payMap = new Map((pays ?? []).map((p: any) => [p.booking_id, p]));

    let created = 0;
    for (const b of bookings ?? []) {
      const p: any = payMap.get(b.booking_id);
      const refundReqId = await nextRefundRequestId(context.supabase);
      const { error } = await context.supabase.from("refund_records").insert({
        booking_id: b.booking_id,
        user_id: b.user_id,
        refund_amount: b.total_amount,
        status: "Approved",
        refund_reason: data.reason,
        refund_type: "Bulk",
        requested_by: "ADMIN",
        flight_number: flight.flight_number,
        flight_id: data.flight_id,
        request_email: b.email,
        request_booking_id: b.booking_id,
        request_txn_id: p?.transaction_reference ?? null,
        refund_to_upi: p?.user_upi_id ?? null,
        is_auto_refund: false,
        refund_request_id: refundReqId,
        admin_notes: data.notes ?? null,
        approved_by: context.userId,
        approved_at: new Date().toISOString(),
      });
      if (!error) {
        created++;
        await context.supabase
          .from("bookings")
          .update({
            booking_status: "Refunded",
            refund_ref_id: refundReqId,
            cancelled_at: new Date().toISOString(),
            cancellation_reason: data.reason,
          })
          .eq("booking_id", b.booking_id);
        await context.supabase.from("passenger_notifications").insert({
          user_id: b.user_id,
          booking_id: b.booking_id,
          flight_id: data.flight_id,
          notification_type: "REFUND_APPROVED",
          title: "Bulk refund approved",
          message: `A refund of ₹${b.total_amount} has been approved for your booking ${b.booking_id}.`,
        });
      }
    }
    await context.supabase.from("admin_actions").insert({
      admin_id: context.userId,
      action_type: "BULK_REFUND",
      target_table: "flights",
      target_id: data.flight_id,
      new_value: { count: created, reason: data.reason },
    });
    return { created };
  });

export const adminSoftDeleteRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ refund_id: z.string().uuid(), reason: z.string().min(2).max(255) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    await context.supabase
      .from("refund_records")
      .update({ is_active: false })
      .eq("id", data.refund_id);
    await context.supabase.from("admin_actions").insert({
      admin_id: context.userId,
      action_type: "REFUND_DELETE",
      target_table: "refund_records",
      target_id: data.refund_id,
      reason: data.reason,
    });
    return { ok: true };
  });
