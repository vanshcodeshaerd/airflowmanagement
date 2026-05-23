
-- 1) Remove public SELECT policies on sensitive tables
DROP POLICY IF EXISTS "anyone reads passenger" ON public.passenger;
DROP POLICY IF EXISTS "anyone reads payment" ON public.payment;
DROP POLICY IF EXISTS "anyone reads baggage" ON public.baggage;
DROP POLICY IF EXISTS "anyone reads check_in" ON public.check_in;

-- 2) Replace with owner-scoped policies (admins already covered via existing ALL policies)
CREATE POLICY "users read own passenger"
  ON public.passenger FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users read own payment"
  ON public.payment FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.booking_id = payment.booking_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "users read own baggage"
  ON public.baggage FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.booking_id = baggage.ticket_number AND b.user_id = auth.uid()
  ));

CREATE POLICY "users read own check_in"
  ON public.check_in FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.booking_id = check_in.ticket_number AND b.user_id = auth.uid()
  ));

-- 3) Remove sensitive tables from realtime publication (if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.passenger; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.payment;   EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.baggage;   EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.check_in;  EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;

-- 4) Lock down SECURITY DEFINER functions: revoke broad EXECUTE, grant only to admins/system
REVOKE EXECUTE ON FUNCTION public.admin_delay_flight(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_cancel_flight(uuid, text)         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_change_gate(uuid, text, text)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_gate_for_flight(uuid)            FROM PUBLIC, anon, authenticated;

-- confirm_booking_with_payment performs its own auth.uid() check, so authenticated users may call it
-- (no change needed there)
