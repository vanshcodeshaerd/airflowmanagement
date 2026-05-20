## UPI Payment + Refund System

Adds a mock UPI payment flow, a user refund portal, auto-refund on flight cancellation, an admin refund management page, and an in-app notification bell. No external APIs — everything is database-backed via Lovable Cloud.

### Scope guardrails
- Do **not** change existing booking, flight, boarding-pass, or admin pages beyond additive insertions.
- All new buttons stay SQUARE (`rounded-none`) and reuse existing tokens (`navy`, `accent`, `accent-strong`, etc.).
- Two new routes only: `/refund` (user) and `/admin/refunds` (admin). Sidebar gets one new admin entry.

---

### 1. Database migration (single migration)

**Extend existing tables (additive only):**
- `payment`: add `transaction_reference` (unique), `user_upi_id`, `gateway_upi_id` default `'airflow.payments@upi'`, `transaction_status` default `'Success'`, `booking_reference`, `remarks`. (Already has `payment_timestamp`, no need to re-add.)
- `refund_records` (existing equivalent of REFUND_INFO): add `refund_type` (`Manual|Auto|Bulk`), `request_email`, `request_booking_id`, `request_txn_id`, `requested_by` (`USER|ADMIN|SYSTEM`), `approved_by`, `approved_at`, `rejected_at`, `rejection_reason`, `refund_to_upi`, `flight_number`, `is_auto_refund` bool, `is_active` bool default true, `admin_notes`, `refund_request_id` (human-readable, e.g. `REF-YYYYMMDD-NNN`).
- `bookings`: ensure cancel columns exist (already has `cancelled_at`, `cancellation_reason`). Add `refund_ref_id` text.
- `passenger_notifications`: extend `notification_type` allowed values to include `REFUND_INITIATED`, `REFUND_APPROVED`, `REFUND_REJECTED` (no constraint change needed — column is free text).

**Update existing `admin_cancel_flight` function** so auto-refunds also:
- set `refund_records.refund_type = 'Auto'`, `requested_by = 'SYSTEM'`, `is_auto_refund = true`, `flight_number`, `refund_to_upi` (from `payment.user_upi_id`), `request_email`, `request_booking_id`, `request_txn_id`.
- update `payment.transaction_status = 'Refunded'` and `payment.payment_status = 'Refund Pending'`.
- notification message includes UPI + refund id.

**Indexes:** unique index on `payment.transaction_reference`, btree on `refund_records(refund_status, is_active)`.

**RLS:**
- `refund_records` already has admin-all + user-read-own. Add `INSERT` policy for authenticated users where `auth.uid() = user_id` (so the refund form can write).
- Admins keep `ALL`.

---

### 2. Server functions (`src/lib/payments-refunds.functions.ts`)
- `completeUpiPayment({ booking_id, user_upi_id, amount })` — generates `TXN-…`, inserts/updates `payment`, marks booking `Confirmed`, returns `{ transaction_reference }`. Auth required.
- `submitRefundRequest({ email, booking_id, transaction_id, reason?, refund_to_upi })` — validates all three IDs belong together, ensures flight is cancelled or delayed, ensures no duplicate non-rejected refund, inserts `refund_records` (status `Pending`, type `Manual`), updates booking status `Refund Requested`, inserts notification, returns `{ refund_request_id }`.
- `cancelOwnBookingForRefund({ booking_id, reason })` — passenger-triggered cancel for delayed flights → same cascade scoped to one booking.
- `listMyNotifications()` / `markNotificationRead({ id })` / `markAllNotificationsRead()`.
- `listMyRefunds()` for the user dashboard.

Admin functions (assertAdmin):
- `adminListRefunds({ status, search?, type? })`
- `adminApproveRefund({ refund_id, amount, admin_notes?, notify })`
- `adminRejectRefund({ refund_id, reason, notes, notify })`
- `adminMarkRefundCredited({ refund_id })`
- `adminBulkRefundFlight({ flight_id, ticket_numbers[], reason, notes })`
- `adminEditRefund({ refund_id, amount?, refund_to_upi?, admin_notes?, status? })`
- `adminSoftDeleteRefund({ refund_id, reason })`

---

### 3. UI surfaces

**Payment UI (additive only):**
- New `UpiPaymentBox` component, shown inside the existing payment step when method = UPI. Three boxes (Pay To, Your UPI, Amount) + green SQUARE pay button + 1.5s simulated processing.
- After success, a `PaymentSuccessTxnCard` rendered alongside existing success info: prominent Transaction ID + Copy button + warning to save it.

**User refund portal (`/refund`):**
- New route file `src/routes/_authenticated/refund.tsx`.
- Form (zod-validated, real-time errors): Email, Booking ID, Transaction ID, Reason dropdown, Refund UPI. Submit → success screen with Refund Request ID, amount, UPI, status badge, "what happens next" box, buttons to My Bookings / Home.

**Notification bell:**
- New `NotificationBell` component mounted in the user-facing header (airport-dashboard header). 30-second polling via `useQuery({ refetchInterval: 30000 })` + realtime invalidation already wired in root. Dropdown lists notifications with icons by type; "Mark all read" + per-item click marks read.

**Booking history additions:**
- On user dashboard / boarding-pass page, each cancelled/delayed booking gets a "Request Refund" or "Cancel & Refund" SQUARE button + refund status badge (Pending / Approved / Rejected / Auto).

**Admin refund management (`/admin/refunds`):**
- New route file `src/routes/admin.refunds.tsx`. Tabs: Pending / Approved / Rejected / Auto. KPI cards on top. Table with Approve/Reject/Details actions. Approve modal (editable amount, notes, notify checkbox). Reject modal (reason dropdown + notes). Bulk Refund modal launched from flight detail's cancel area and from a top-bar button (lists confirmed passengers for a chosen flight with checkboxes).
- Sidebar (`AdminSidebar.tsx`): add "Refunds" entry between Operations and the disabled stubs.

---

### 4. Technical notes
- Transaction ID generated server-side (`generateTransactionId`) — clients never invent it.
- Refund Request ID: `REF-YYYYMMDD-NNN` where NNN is a per-day counter (computed in the server fn via `count(*) where date(initiated_at)=today`).
- Realtime: `refund_records` is added to the existing realtime publication if not already there; the root `RealtimeSync` already lists it ✓.
- Validation: all server fns use zod. Email lowercased+trimmed; UPI must contain `@`.
- Soft delete: never hard-delete; `is_active=false` plus reason logged to `admin_actions`.
- No new packages required.

---

### 5. Files

**New**
- `src/lib/payments-refunds.functions.ts`
- `src/components/payments/UpiPaymentBox.tsx`
- `src/components/payments/PaymentSuccessTxnCard.tsx`
- `src/components/notifications/NotificationBell.tsx`
- `src/components/refunds/RefundStatusBadge.tsx`
- `src/routes/_authenticated/refund.tsx`
- `src/routes/admin.refunds.tsx`
- `src/components/admin/refunds/ApproveRefundModal.tsx`
- `src/components/admin/refunds/RejectRefundModal.tsx`
- `src/components/admin/refunds/BulkRefundModal.tsx`

**Edited (minimal)**
- `src/components/admin/AdminSidebar.tsx` — add Refunds link.
- Existing payment step component — render `UpiPaymentBox` when method = UPI; render `PaymentSuccessTxnCard` on success. (Will locate during implementation.)
- Existing user header — mount `NotificationBell`.
- Existing booking/boarding-pass cards — add refund action button + status badge.
- Migration file under `supabase/migrations/`.

Once approved, I'll start with the migration and walk through the rest.
