
-- PAYMENT additions
ALTER TABLE public.payment
  ADD COLUMN IF NOT EXISTS transaction_reference text,
  ADD COLUMN IF NOT EXISTS user_upi_id text,
  ADD COLUMN IF NOT EXISTS gateway_upi_id text DEFAULT 'airflow.payments@upi',
  ADD COLUMN IF NOT EXISTS transaction_status text DEFAULT 'Success',
  ADD COLUMN IF NOT EXISTS remarks text;

CREATE UNIQUE INDEX IF NOT EXISTS payment_transaction_reference_uidx
  ON public.payment(transaction_reference)
  WHERE transaction_reference IS NOT NULL;

-- REFUND_RECORDS additions
ALTER TABLE public.refund_records
  ADD COLUMN IF NOT EXISTS refund_request_id text,
  ADD COLUMN IF NOT EXISTS request_email text,
  ADD COLUMN IF NOT EXISTS request_booking_id text,
  ADD COLUMN IF NOT EXISTS request_txn_id text,
  ADD COLUMN IF NOT EXISTS requested_by text DEFAULT 'USER',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS refund_to_upi text,
  ADD COLUMN IF NOT EXISTS flight_number text,
  ADD COLUMN IF NOT EXISTS flight_id uuid,
  ADD COLUMN IF NOT EXISTS is_auto_refund boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS admin_notes text;

CREATE UNIQUE INDEX IF NOT EXISTS refund_records_request_id_uidx
  ON public.refund_records(refund_request_id)
  WHERE refund_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS refund_records_status_active_idx
  ON public.refund_records(status, is_active);

-- BOOKINGS link
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS refund_ref_id text;

-- Allow users to submit their own refund requests
DROP POLICY IF EXISTS "users insert own refunds" ON public.refund_records;
CREATE POLICY "users insert own refunds"
  ON public.refund_records
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.refund_records;

-- Update admin_cancel_flight to enrich refund_records with the new fields
CREATE OR REPLACE FUNCTION public.admin_cancel_flight(p_flight_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_flight flights%ROWTYPE;
  v_day    text;
  v_seq    int;
BEGIN
  IF NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  SELECT * INTO v_flight FROM flights WHERE id = p_flight_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Flight not found'; END IF;

  UPDATE flights
     SET flight_status = 'Cancelled',
         cancellation_reason = p_reason,
         cancelled_at = now(),
         is_visible_on_ui = false
   WHERE id = p_flight_id;

  INSERT INTO flight_status_history (flight_id, previous_status, current_status, reason, changed_by)
  VALUES (p_flight_id, v_flight.flight_status, 'Cancelled', p_reason, v_caller::text);

  v_day := to_char(now(), 'YYYYMMDD');
  SELECT COALESCE(MAX(SUBSTRING(refund_request_id FROM 14)::int), 0)
    INTO v_seq
    FROM refund_records
   WHERE refund_request_id LIKE 'REF-' || v_day || '-%';

  -- Auto refunds: one row per confirmed booking
  INSERT INTO refund_records (
    booking_id, user_id, refund_amount, refund_reason, status,
    refund_type, requested_by, is_auto_refund, flight_number, flight_id,
    request_email, request_booking_id, request_txn_id, refund_to_upi,
    refund_request_id
  )
  SELECT
    b.booking_id, b.user_id, b.total_amount,
    'Flight cancelled: ' || COALESCE(p_reason,''), 'Pending',
    'Auto', 'SYSTEM', true, v_flight.flight_number, p_flight_id,
    b.email, b.booking_id, p.transaction_reference, p.user_upi_id,
    'REF-' || v_day || '-' || lpad((v_seq + row_number() OVER (ORDER BY b.booking_id))::text, 3, '0')
    FROM bookings b
    LEFT JOIN payment p ON p.booking_id = b.booking_id
   WHERE b.flight_id = p_flight_id AND b.booking_status = 'Confirmed';

  UPDATE bookings
     SET booking_status = 'Cancelled',
         cancellation_reason = p_reason,
         cancelled_at = now()
   WHERE flight_id = p_flight_id AND booking_status = 'Confirmed';

  UPDATE payment
     SET payment_status = 'Refund Pending',
         transaction_status = 'Refunded',
         updated_at = now()
   WHERE booking_id IN (SELECT booking_id FROM bookings WHERE flight_id = p_flight_id);

  UPDATE boarding_passes
     SET is_valid = false,
         invalidation_reason = 'Flight cancelled',
         is_updated = true,
         update_reason = COALESCE('CANCELLED: ' || p_reason, 'CANCELLED')
   WHERE flight_id = p_flight_id;

  INSERT INTO boarding_pass_updates (booking_id, update_type, update_description, old_value, new_value)
  SELECT bp.booking_id, 'CANCELLATION', 'Flight cancelled', 'Valid', 'Invalid'
    FROM boarding_passes bp WHERE bp.flight_id = p_flight_id;

  UPDATE flight_gate_assignments SET is_active = false WHERE flight_id = p_flight_id;

  INSERT INTO passenger_notifications (user_id, booking_id, flight_id, notification_type, title, message)
  SELECT b.user_id, b.booking_id, p_flight_id, 'CANCELLATION',
         'Flight ' || v_flight.flight_number || ' cancelled — Auto refund initiated',
         'Your flight has been cancelled. A full refund of ₹' || b.total_amount ||
         ' will be credited to ' || COALESCE((SELECT user_upi_id FROM payment WHERE booking_id = b.booking_id LIMIT 1), 'your registered UPI ID') ||
         ' within 5–7 business days.' ||
         COALESCE(' Reason: ' || p_reason, '')
    FROM bookings b WHERE b.flight_id = p_flight_id;

  INSERT INTO admin_actions (admin_id, action_type, target_table, target_id, previous_value, new_value, reason)
  VALUES (v_caller, 'CANCEL_FLIGHT', 'flights', p_flight_id::text,
          jsonb_build_object('status', v_flight.flight_status),
          jsonb_build_object('status', 'Cancelled'),
          p_reason);
END;
$function$;
