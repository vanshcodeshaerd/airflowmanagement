
-- 1. Normalize payment_status values
UPDATE public.payment SET payment_status = 'Success' WHERE payment_status = 'Completed';
UPDATE public.payment SET transaction_status = 'Success' WHERE transaction_status = 'Completed';

-- Add check constraint for allowed values
ALTER TABLE public.payment DROP CONSTRAINT IF EXISTS payment_status_check;
ALTER TABLE public.payment ADD CONSTRAINT payment_status_check
  CHECK (payment_status IN ('Success','Failed','Pending','Refunded','Refund Pending'));

-- 4. Unique active refund per txn (partial index)
DROP INDEX IF EXISTS uniq_active_refund_per_txn;
CREATE UNIQUE INDEX uniq_active_refund_per_txn
  ON public.refund_records (request_txn_id)
  WHERE is_active = true AND status <> 'Rejected' AND request_txn_id IS NOT NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_flight_id ON public.bookings(flight_id);
CREATE INDEX IF NOT EXISTS idx_payment_booking_id ON public.payment(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_txn_ref ON public.payment(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_refund_user_id ON public.refund_records(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.passenger_notifications(user_id, is_read);

-- 5. Atomic booking + payment confirmation
CREATE OR REPLACE FUNCTION public.confirm_booking_with_payment(
  p_booking_id text,
  p_user_id uuid,
  p_flight_id uuid,
  p_passenger_name text,
  p_passenger_age int,
  p_passenger_phone text,
  p_passenger_email text,
  p_passenger_passport text,
  p_seat_number text,
  p_cabin_class text,
  p_total_amount numeric,
  p_payment_id text,
  p_txn_ref text,
  p_user_upi text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO bookings (
    booking_id, user_id, flight_id, passenger_name, passenger_age,
    passenger_phone, email, passenger_passport_id, seat_number, cabin_class,
    total_amount, booking_status
  ) VALUES (
    p_booking_id, p_user_id, p_flight_id, p_passenger_name, p_passenger_age,
    p_passenger_phone, p_passenger_email, p_passenger_passport, p_seat_number, p_cabin_class,
    p_total_amount, 'Confirmed'
  );

  INSERT INTO passenger (ticket_number, passenger_name, age, contact_info, email, passport_id, user_id, is_active)
  VALUES (p_booking_id, p_passenger_name, p_passenger_age, p_passenger_phone, p_passenger_email, p_passenger_passport, p_user_id, true)
  ON CONFLICT (ticket_number) DO NOTHING;

  INSERT INTO payment (
    payment_id, ticket_number, booking_id, amount, payment_status, payment_method,
    transaction_reference, user_upi_id, gateway_upi_id, transaction_status
  ) VALUES (
    p_payment_id, p_booking_id, p_booking_id, p_total_amount, 'Success', 'UPI',
    p_txn_ref, p_user_upi, 'airflow.payments@upi', 'Success'
  );
END;
$$;
