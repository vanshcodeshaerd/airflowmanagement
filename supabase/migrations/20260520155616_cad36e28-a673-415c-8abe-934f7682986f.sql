-- ============================================================
-- ADMIN AUDIT / NOTIFICATION TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        uuid NOT NULL,
  action_type     text NOT NULL,
  target_table    text NOT NULL,
  target_id       text NOT NULL,
  previous_value  jsonb,
  new_value       jsonb,
  reason          text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin   ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type    ON public.admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target  ON public.admin_actions(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON public.admin_actions(created_at DESC);
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage admin_actions" ON public.admin_actions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.passenger_notifications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL,
  booking_id         text,
  flight_id          uuid,
  notification_type  text NOT NULL CHECK (notification_type IN (
    'DELAY','CANCELLATION','GATE_CHANGE','TERMINAL_CHANGE',
    'BOARDING_ALERT','CHECKIN_REMINDER','BOOKING_CONFIRMED',
    'BOOKING_CANCELLED','REFUND_INITIATED','GENERAL','TIME_CHANGE'
  )),
  title              text NOT NULL,
  message            text NOT NULL,
  is_read            boolean NOT NULL DEFAULT false,
  sent_at            timestamptz NOT NULL DEFAULT now(),
  read_at            timestamptz
);
CREATE INDEX IF NOT EXISTS idx_passenger_notif_user   ON public.passenger_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_passenger_notif_flight ON public.passenger_notifications(flight_id);
CREATE INDEX IF NOT EXISTS idx_passenger_notif_read   ON public.passenger_notifications(is_read);
ALTER TABLE public.passenger_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own notifications" ON public.passenger_notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users update own notifications" ON public.passenger_notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins manage notifications" ON public.passenger_notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.refund_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      text NOT NULL,
  user_id         uuid NOT NULL,
  refund_amount   numeric(12,2) NOT NULL,
  refund_reason   text,
  refund_type     text NOT NULL DEFAULT 'FULL_REFUND' CHECK (refund_type IN ('FULL_REFUND','PARTIAL_REFUND','VOUCHER')),
  status          text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Processing','Completed','Rejected')),
  initiated_by    uuid,
  initiated_at    timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_refund_booking ON public.refund_records(booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_user    ON public.refund_records(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_status  ON public.refund_records(status);
ALTER TABLE public.refund_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own refunds" ON public.refund_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins manage refunds" ON public.refund_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.boarding_pass_updates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          text NOT NULL,
  update_type         text NOT NULL CHECK (update_type IN ('GATE_CHANGE','DELAY','CANCELLATION','TIME_CHANGE','SEAT_CHANGE','TERMINAL_CHANGE')),
  update_description  text,
  old_value           text,
  new_value           text,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  notified_passenger  boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_bpu_booking ON public.boarding_pass_updates(booking_id);
ALTER TABLE public.boarding_pass_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage bp updates" ON public.boarding_pass_updates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users read own bp updates" ON public.boarding_pass_updates
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.booking_id = boarding_pass_updates.booking_id AND b.user_id = auth.uid()));

-- ============================================================
-- CASCADING DB FUNCTIONS (SECURITY DEFINER, admin-only)
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_delay_flight(
  p_flight_id uuid,
  p_delay_minutes integer,
  p_reason text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller    uuid := auth.uid();
  v_flight    flights%ROWTYPE;
  v_prev_dep  timestamptz;
  v_prev_arr  timestamptz;
  v_new_dep   timestamptz;
  v_new_arr   timestamptz;
BEGIN
  IF NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;
  IF p_delay_minutes IS NULL OR p_delay_minutes <= 0 THEN
    RAISE EXCEPTION 'Delay minutes must be positive';
  END IF;

  SELECT * INTO v_flight FROM flights WHERE id = p_flight_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Flight not found'; END IF;

  v_prev_dep := v_flight.departure_datetime;
  v_prev_arr := v_flight.arrival_datetime;
  v_new_dep  := v_prev_dep + make_interval(mins => p_delay_minutes);
  v_new_arr  := v_prev_arr + make_interval(mins => p_delay_minutes);

  UPDATE flights
     SET departure_datetime = v_new_dep,
         arrival_datetime   = v_new_arr,
         delay_minutes      = COALESCE(delay_minutes,0) + p_delay_minutes,
         delay_reason       = p_reason,
         flight_status      = 'Delayed'
   WHERE id = p_flight_id;

  INSERT INTO flight_status_history (flight_id, previous_status, current_status, reason, changed_by)
  VALUES (p_flight_id, v_flight.flight_status, 'Delayed', p_reason, v_caller::text);

  UPDATE boarding_passes
     SET boarding_time   = boarding_time + make_interval(mins => p_delay_minutes),
         departure_time  = COALESCE(departure_time, v_prev_dep) + make_interval(mins => p_delay_minutes),
         arrival_time    = COALESCE(arrival_time, v_prev_arr) + make_interval(mins => p_delay_minutes),
         is_updated      = true,
         update_reason   = COALESCE('DELAY: ' || p_reason, 'DELAY')
   WHERE flight_id = p_flight_id AND is_valid = true;

  INSERT INTO boarding_pass_updates (booking_id, update_type, update_description, old_value, new_value)
  SELECT bp.booking_id, 'DELAY', 'Flight delayed ' || p_delay_minutes || ' min',
         to_char(v_prev_dep, 'YYYY-MM-DD HH24:MI'),
         to_char(v_new_dep,  'YYYY-MM-DD HH24:MI')
    FROM boarding_passes bp
   WHERE bp.flight_id = p_flight_id;

  INSERT INTO passenger_notifications (user_id, booking_id, flight_id, notification_type, title, message)
  SELECT b.user_id, b.booking_id, p_flight_id, 'DELAY',
         'Flight ' || v_flight.flight_number || ' delayed',
         'Your flight is delayed by ' || p_delay_minutes || ' minutes. New departure: ' ||
         to_char(v_new_dep, 'DD Mon YYYY HH24:MI') || COALESCE('. Reason: ' || p_reason, '.')
    FROM bookings b
   WHERE b.flight_id = p_flight_id AND b.booking_status = 'Confirmed';

  INSERT INTO admin_actions (admin_id, action_type, target_table, target_id, previous_value, new_value, reason)
  VALUES (v_caller, 'DELAY_FLIGHT', 'flights', p_flight_id::text,
          jsonb_build_object('departure', v_prev_dep, 'status', v_flight.flight_status),
          jsonb_build_object('departure', v_new_dep, 'status', 'Delayed', 'delay_minutes', p_delay_minutes),
          p_reason);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delay_flight(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delay_flight(uuid, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_cancel_flight(
  p_flight_id uuid,
  p_reason text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_flight flights%ROWTYPE;
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

  INSERT INTO refund_records (booking_id, user_id, refund_amount, refund_reason, status)
  SELECT b.booking_id, b.user_id, b.total_amount, 'Flight cancelled: ' || COALESCE(p_reason,''), 'Pending'
    FROM bookings b
   WHERE b.flight_id = p_flight_id AND b.booking_status = 'Confirmed';

  UPDATE bookings
     SET booking_status = 'Cancelled',
         cancellation_reason = p_reason,
         cancelled_at = now()
   WHERE flight_id = p_flight_id AND booking_status = 'Confirmed';

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
         'Flight ' || v_flight.flight_number || ' cancelled',
         'We regret to inform you that your flight has been cancelled. ' ||
         COALESCE('Reason: ' || p_reason || '. ', '') || 'A full refund has been initiated.'
    FROM bookings b WHERE b.flight_id = p_flight_id;

  INSERT INTO admin_actions (admin_id, action_type, target_table, target_id, previous_value, new_value, reason)
  VALUES (v_caller, 'CANCEL_FLIGHT', 'flights', p_flight_id::text,
          jsonb_build_object('status', v_flight.flight_status),
          jsonb_build_object('status', 'Cancelled'),
          p_reason);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_cancel_flight(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_cancel_flight(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_change_gate(
  p_flight_id uuid,
  p_new_terminal text,
  p_new_gate text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_flight   flights%ROWTYPE;
  v_old_gate text;
  v_old_term text;
  v_gate_id  uuid;
  v_blocked  timestamptz;
  v_conflict integer;
BEGIN
  IF NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  SELECT * INTO v_flight FROM flights WHERE id = p_flight_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Flight not found'; END IF;

  v_old_gate := v_flight.gate_number;
  v_old_term := v_flight.terminal;
  v_blocked  := COALESCE(v_flight.arrival_datetime, v_flight.departure_datetime + make_interval(mins => v_flight.duration_minutes))
              + interval '15 minutes';

  SELECT id INTO v_gate_id FROM gates
   WHERE airport_code = v_flight.source_code AND gate_number = p_new_gate AND terminal = p_new_terminal AND is_active;
  IF v_gate_id IS NULL THEN
    RAISE EXCEPTION 'Gate % at terminal % not found for airport %', p_new_gate, p_new_terminal, v_flight.source_code;
  END IF;

  SELECT count(*) INTO v_conflict
    FROM flight_gate_assignments fga
    JOIN flights f2 ON f2.id = fga.flight_id
   WHERE fga.gate_id = v_gate_id
     AND fga.is_active
     AND fga.flight_id <> p_flight_id
     AND fga.gate_blocked_until > v_flight.departure_datetime
     AND f2.departure_datetime < v_blocked;
  IF v_conflict > 0 THEN
    RAISE EXCEPTION 'Gate % conflicts with another flight in this time window', p_new_gate;
  END IF;

  UPDATE flight_gate_assignments SET is_active = false WHERE flight_id = p_flight_id AND is_active;
  INSERT INTO flight_gate_assignments (flight_id, gate_id, airport_code, terminal, gate_number, gate_blocked_until)
  VALUES (p_flight_id, v_gate_id, v_flight.source_code, p_new_terminal, p_new_gate, v_blocked);

  UPDATE flights SET gate_number = p_new_gate, terminal = p_new_terminal WHERE id = p_flight_id;

  UPDATE boarding_passes
     SET gate_number = p_new_gate, is_updated = true,
         update_reason = 'GATE_CHANGE: ' || COALESCE(v_old_gate,'TBD') || ' → ' || p_new_gate
   WHERE flight_id = p_flight_id AND is_valid;

  INSERT INTO boarding_pass_updates (booking_id, update_type, update_description, old_value, new_value)
  SELECT bp.booking_id, 'GATE_CHANGE', 'Gate reassigned',
         COALESCE(v_old_term,'?') || ' / ' || COALESCE(v_old_gate,'TBD'),
         p_new_terminal || ' / ' || p_new_gate
    FROM boarding_passes bp WHERE bp.flight_id = p_flight_id;

  INSERT INTO passenger_notifications (user_id, booking_id, flight_id, notification_type, title, message)
  SELECT b.user_id, b.booking_id, p_flight_id, 'GATE_CHANGE',
         'Gate changed for ' || v_flight.flight_number,
         'New gate: ' || p_new_gate || ', Terminal ' || p_new_terminal ||
         '. Please proceed to the new boarding gate.'
    FROM bookings b WHERE b.flight_id = p_flight_id AND b.booking_status = 'Confirmed';

  INSERT INTO admin_actions (admin_id, action_type, target_table, target_id, previous_value, new_value)
  VALUES (v_caller, 'CHANGE_GATE', 'flights', p_flight_id::text,
          jsonb_build_object('terminal', v_old_term, 'gate', v_old_gate),
          jsonb_build_object('terminal', p_new_terminal, 'gate', p_new_gate));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_change_gate(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_change_gate(uuid, text, text) TO authenticated;