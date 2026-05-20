
-- ============================================================
-- Admin Portal Phase 1 migration
-- ============================================================

-- ---------- Column additions on existing tables ----------
ALTER TABLE public.flights
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE public.boarding_passes
  ADD COLUMN IF NOT EXISTS is_valid boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS invalidation_reason text,
  ADD COLUMN IF NOT EXISTS is_updated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS update_reason text,
  ADD COLUMN IF NOT EXISTS departure_time timestamptz,
  ADD COLUMN IF NOT EXISTS arrival_time timestamptz;

-- ---------- admin_actions ----------
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  action_type text NOT NULL,
  target_entity text NOT NULL,
  target_id text NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON public.admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON public.admin_actions(target_entity, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_time ON public.admin_actions(created_at DESC);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage admin actions"
  ON public.admin_actions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ---------- passenger_notifications ----------
CREATE TABLE IF NOT EXISTS public.passenger_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  booking_id text,
  flight_id uuid,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON public.passenger_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_flight ON public.passenger_notifications(flight_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON public.passenger_notifications(user_id, is_read);

ALTER TABLE public.passenger_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage notifications"
  ON public.passenger_notifications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "users read own notifications"
  ON public.passenger_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "users update own notifications read state"
  ON public.passenger_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ---------- refund_records ----------
CREATE TABLE IF NOT EXISTS public.refund_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id text NOT NULL,
  user_id uuid,
  refund_amount numeric(10,2) NOT NULL,
  refund_reason text,
  refund_type text NOT NULL DEFAULT 'FULL_REFUND',
  status text NOT NULL DEFAULT 'Pending',
  initiated_by uuid,
  initiated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_refund_booking ON public.refund_records(booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_status ON public.refund_records(status);
CREATE INDEX IF NOT EXISTS idx_refund_user ON public.refund_records(user_id);

ALTER TABLE public.refund_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage refunds"
  ON public.refund_records FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "users read own refunds"
  ON public.refund_records FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ---------- boarding_pass_updates ----------
CREATE TABLE IF NOT EXISTS public.boarding_pass_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boarding_pass_id uuid,
  booking_id text NOT NULL,
  update_type text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bp_update_booking ON public.boarding_pass_updates(booking_id);

ALTER TABLE public.boarding_pass_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage boarding pass updates"
  ON public.boarding_pass_updates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "anyone reads boarding pass updates"
  ON public.boarding_pass_updates FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- Cascading admin functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_delay_flight(
  p_flight_id uuid,
  p_delay_minutes integer,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flight flights%ROWTYPE;
  v_new_dep timestamptz;
  v_new_arr timestamptz;
  v_admin uuid := auth.uid();
  v_booking record;
BEGIN
  SELECT * INTO v_flight FROM flights WHERE id = p_flight_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Flight not found'; END IF;

  v_new_dep := v_flight.departure_datetime + (p_delay_minutes || ' minutes')::interval;
  v_new_arr := v_flight.arrival_datetime   + (p_delay_minutes || ' minutes')::interval;

  UPDATE flights
     SET departure_datetime = v_new_dep,
         arrival_datetime   = v_new_arr,
         delay_minutes      = COALESCE(delay_minutes,0) + p_delay_minutes,
         delay_reason       = p_reason,
         flight_status      = 'Delayed'
   WHERE id = p_flight_id;

  UPDATE boarding_passes
     SET departure_time = v_new_dep,
         arrival_time   = v_new_arr,
         boarding_time  = v_new_dep - interval '30 minutes',
         is_updated     = true,
         update_reason  = 'Delay: +' || p_delay_minutes || ' min'
   WHERE flight_id = p_flight_id;

  INSERT INTO boarding_pass_updates (boarding_pass_id, booking_id, update_type, description)
  SELECT bp.id, bp.booking_id, 'DELAY',
         'Flight delayed by ' || p_delay_minutes || ' min. Reason: ' || COALESCE(p_reason,'N/A')
    FROM boarding_passes bp WHERE bp.flight_id = p_flight_id;

  INSERT INTO flight_status_history (flight_id, previous_status, current_status, changed_by, reason)
  VALUES (p_flight_id, v_flight.flight_status, 'Delayed', COALESCE(v_admin::text,'admin'),
          'Delay +' || p_delay_minutes || ' min: ' || COALESCE(p_reason,''));

  INSERT INTO admin_actions (admin_id, action_type, target_entity, target_id, previous_value, new_value, reason)
  VALUES (v_admin, 'FLIGHT_DELAY', 'flights', p_flight_id::text,
          jsonb_build_object('departure_datetime', v_flight.departure_datetime,
                             'arrival_datetime',   v_flight.arrival_datetime,
                             'status',             v_flight.flight_status),
          jsonb_build_object('departure_datetime', v_new_dep,
                             'arrival_datetime',   v_new_arr,
                             'delay_minutes',      p_delay_minutes,
                             'status',             'Delayed'),
          p_reason);

  FOR v_booking IN
    SELECT b.user_id, b.booking_id
      FROM bookings b
     WHERE b.flight_id = p_flight_id
       AND b.booking_status NOT IN ('Cancelled')
  LOOP
    INSERT INTO passenger_notifications (user_id, booking_id, flight_id, notification_type, title, message)
    VALUES (v_booking.user_id, v_booking.booking_id, p_flight_id, 'DELAY',
            'Flight ' || v_flight.flight_number || ' delayed',
            'Your flight ' || v_flight.flight_number || ' is delayed by ' || p_delay_minutes
            || ' minutes. New departure: ' || to_char(v_new_dep AT TIME ZONE 'Asia/Kolkata','DD Mon HH24:MI')
            || COALESCE('. Reason: ' || p_reason, '') || '.');
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_cancel_flight(
  p_flight_id uuid,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flight flights%ROWTYPE;
  v_admin uuid := auth.uid();
  v_booking record;
BEGIN
  SELECT * INTO v_flight FROM flights WHERE id = p_flight_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Flight not found'; END IF;

  UPDATE flights
     SET flight_status        = 'Cancelled',
         is_visible_on_ui     = false,
         cancellation_reason  = p_reason,
         cancelled_at         = now()
   WHERE id = p_flight_id;

  UPDATE boarding_passes
     SET is_valid             = false,
         invalidation_reason  = 'Flight cancelled: ' || COALESCE(p_reason,'N/A'),
         is_updated           = true,
         update_reason        = 'Flight cancelled'
   WHERE flight_id = p_flight_id;

  INSERT INTO boarding_pass_updates (boarding_pass_id, booking_id, update_type, description)
  SELECT bp.id, bp.booking_id, 'CANCELLATION',
         'Flight cancelled. Reason: ' || COALESCE(p_reason,'N/A')
    FROM boarding_passes bp WHERE bp.flight_id = p_flight_id;

  UPDATE flight_gate_assignments
     SET is_active = false
   WHERE flight_id = p_flight_id AND is_active;

  FOR v_booking IN
    SELECT b.id, b.user_id, b.booking_id, b.total_amount
      FROM bookings b
     WHERE b.flight_id = p_flight_id
       AND b.booking_status NOT IN ('Cancelled')
  LOOP
    UPDATE bookings
       SET booking_status = 'Cancelled',
           cancellation_reason = p_reason,
           cancelled_at = now()
     WHERE id = v_booking.id;

    INSERT INTO refund_records (booking_id, user_id, refund_amount, refund_reason, refund_type, status, initiated_by)
    VALUES (v_booking.booking_id, v_booking.user_id, v_booking.total_amount,
            'Flight cancellation: ' || COALESCE(p_reason,'N/A'),
            'FULL_REFUND', 'Pending', v_admin);

    INSERT INTO passenger_notifications (user_id, booking_id, flight_id, notification_type, title, message)
    VALUES (v_booking.user_id, v_booking.booking_id, p_flight_id, 'CANCELLATION',
            'Flight ' || v_flight.flight_number || ' cancelled',
            'Your flight ' || v_flight.flight_number || ' has been cancelled. A full refund of ₹'
            || v_booking.total_amount || ' will be processed within 5-7 business days.'
            || COALESCE(' Reason: ' || p_reason, '') );
  END LOOP;

  INSERT INTO flight_status_history (flight_id, previous_status, current_status, changed_by, reason)
  VALUES (p_flight_id, v_flight.flight_status, 'Cancelled', COALESCE(v_admin::text,'admin'), p_reason);

  INSERT INTO admin_actions (admin_id, action_type, target_entity, target_id, previous_value, new_value, reason)
  VALUES (v_admin, 'FLIGHT_CANCEL', 'flights', p_flight_id::text,
          jsonb_build_object('status', v_flight.flight_status),
          jsonb_build_object('status', 'Cancelled'),
          p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_change_gate(
  p_flight_id uuid,
  p_new_gate_id uuid
) RETURNS TABLE(gate_number text, terminal text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flight flights%ROWTYPE;
  v_gate gates%ROWTYPE;
  v_blocked_until timestamptz;
  v_admin uuid := auth.uid();
  v_booking record;
  v_conflict_count integer;
BEGIN
  SELECT * INTO v_flight FROM flights WHERE id = p_flight_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Flight not found'; END IF;

  SELECT * INTO v_gate FROM gates WHERE id = p_new_gate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Gate not found'; END IF;
  IF v_gate.airport_code <> v_flight.source_code THEN
    RAISE EXCEPTION 'Gate is at a different airport';
  END IF;

  v_blocked_until := COALESCE(v_flight.arrival_datetime,
                              v_flight.departure_datetime + (v_flight.duration_minutes||' minutes')::interval)
                     + interval '15 minutes';

  SELECT COUNT(*) INTO v_conflict_count
  FROM flight_gate_assignments fga
  JOIN flights f2 ON f2.id = fga.flight_id
  WHERE fga.gate_id = p_new_gate_id
    AND fga.is_active
    AND fga.flight_id <> p_flight_id
    AND fga.gate_blocked_until > v_flight.departure_datetime
    AND f2.departure_datetime < v_blocked_until;
  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Gate % is occupied during this flight window', v_gate.gate_number;
  END IF;

  UPDATE flight_gate_assignments SET is_active = false
   WHERE flight_id = p_flight_id AND is_active;

  INSERT INTO flight_gate_assignments
    (flight_id, gate_id, airport_code, terminal, gate_number, gate_blocked_until)
  VALUES
    (p_flight_id, v_gate.id, v_gate.airport_code, v_gate.terminal, v_gate.gate_number, v_blocked_until);

  UPDATE flights
     SET gate_number = v_gate.gate_number,
         terminal    = v_gate.terminal
   WHERE id = p_flight_id;

  UPDATE boarding_passes
     SET gate_number   = v_gate.gate_number,
         is_updated    = true,
         update_reason = 'Gate changed to ' || v_gate.gate_number
   WHERE flight_id = p_flight_id;

  INSERT INTO boarding_pass_updates (boarding_pass_id, booking_id, update_type, description)
  SELECT bp.id, bp.booking_id, 'GATE_CHANGE',
         'Gate changed to ' || v_gate.gate_number || ', Terminal ' || v_gate.terminal
    FROM boarding_passes bp WHERE bp.flight_id = p_flight_id;

  INSERT INTO admin_actions (admin_id, action_type, target_entity, target_id, previous_value, new_value)
  VALUES (v_admin, 'GATE_CHANGE', 'flights', p_flight_id::text,
          jsonb_build_object('gate', v_flight.gate_number, 'terminal', v_flight.terminal),
          jsonb_build_object('gate', v_gate.gate_number,  'terminal', v_gate.terminal));

  FOR v_booking IN
    SELECT b.user_id, b.booking_id
      FROM bookings b
     WHERE b.flight_id = p_flight_id
       AND b.booking_status NOT IN ('Cancelled')
  LOOP
    INSERT INTO passenger_notifications (user_id, booking_id, flight_id, notification_type, title, message)
    VALUES (v_booking.user_id, v_booking.booking_id, p_flight_id, 'GATE_CHANGE',
            'Gate change for ' || v_flight.flight_number,
            'New gate for flight ' || v_flight.flight_number || ': Gate ' || v_gate.gate_number
            || ', Terminal ' || v_gate.terminal || '. Please proceed to the new gate.');
  END LOOP;

  RETURN QUERY SELECT v_gate.gate_number, v_gate.terminal;
END;
$$;
