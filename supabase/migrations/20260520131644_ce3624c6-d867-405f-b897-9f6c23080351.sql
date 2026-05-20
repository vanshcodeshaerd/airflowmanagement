-- 1. Extend flights with status tracking columns
ALTER TABLE public.flights
  ADD COLUMN IF NOT EXISTS terminal text,
  ADD COLUMN IF NOT EXISTS actual_departure_time timestamptz,
  ADD COLUMN IF NOT EXISTS actual_arrival_time timestamptz,
  ADD COLUMN IF NOT EXISTS delay_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delay_reason text;

-- 2. Gates pool
CREATE TABLE IF NOT EXISTS public.gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_code text NOT NULL,
  terminal text NOT NULL,
  gate_number text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (airport_code, terminal, gate_number)
);
CREATE INDEX IF NOT EXISTS idx_gates_airport ON public.gates(airport_code) WHERE is_active;

-- 3. Flight ↔ gate assignment (one active row per flight)
CREATE TABLE IF NOT EXISTS public.flight_gate_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id uuid NOT NULL REFERENCES public.flights(id) ON DELETE CASCADE,
  gate_id uuid NOT NULL REFERENCES public.gates(id),
  airport_code text NOT NULL,
  terminal text NOT NULL,
  gate_number text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  gate_blocked_until timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fga_flight_active
  ON public.flight_gate_assignments(flight_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_fga_gate
  ON public.flight_gate_assignments(gate_id, gate_blocked_until) WHERE is_active;

-- 4. Status history
CREATE TABLE IF NOT EXISTS public.flight_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id uuid NOT NULL REFERENCES public.flights(id) ON DELETE CASCADE,
  previous_status text,
  current_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  changed_by text NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_fsh_flight ON public.flight_status_history(flight_id, changed_at DESC);

-- 5. RLS
ALTER TABLE public.gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_gate_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads gates" ON public.gates FOR SELECT USING (true);
CREATE POLICY "admins manage gates" ON public.gates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "anyone reads gate assignments" ON public.flight_gate_assignments FOR SELECT USING (true);
CREATE POLICY "admins manage gate assignments" ON public.flight_gate_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "anyone reads status history" ON public.flight_status_history FOR SELECT USING (true);
CREATE POLICY "admins manage status history" ON public.flight_status_history FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 6. Atomic gate-assignment function (collision-free)
CREATE OR REPLACE FUNCTION public.assign_gate_for_flight(p_flight_id uuid)
RETURNS TABLE (gate_number text, terminal text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flight       flights%ROWTYPE;
  v_blocked_until timestamptz;
  v_gate_id      uuid;
  v_gate_number  text;
  v_terminal     text;
BEGIN
  SELECT * INTO v_flight FROM flights WHERE id = p_flight_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Flight not found'; END IF;

  -- Already assigned? return it.
  SELECT g.gate_number, g.terminal
    INTO v_gate_number, v_terminal
  FROM flight_gate_assignments fga
  JOIN gates g ON g.id = fga.gate_id
  WHERE fga.flight_id = p_flight_id AND fga.is_active;
  IF FOUND THEN
    RETURN QUERY SELECT v_gate_number, v_terminal; RETURN;
  END IF;

  v_blocked_until := COALESCE(v_flight.arrival_datetime,
                              v_flight.departure_datetime + (v_flight.duration_minutes || ' minutes')::interval)
                     + interval '15 minutes';

  -- Pick first gate at this airport with no overlapping window.
  SELECT g.id, g.gate_number, g.terminal
    INTO v_gate_id, v_gate_number, v_terminal
  FROM gates g
  WHERE g.airport_code = v_flight.source_code
    AND g.is_active
    AND NOT EXISTS (
      SELECT 1
      FROM flight_gate_assignments fga
      JOIN flights f2 ON f2.id = fga.flight_id
      WHERE fga.gate_id = g.id
        AND fga.is_active
        AND fga.gate_blocked_until > v_flight.departure_datetime
        AND f2.departure_datetime < v_blocked_until
    )
  ORDER BY g.terminal, g.gate_number
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_gate_id IS NULL THEN
    RAISE EXCEPTION 'No gate available at % for flight %', v_flight.source_code, v_flight.flight_number;
  END IF;

  INSERT INTO flight_gate_assignments
    (flight_id, gate_id, airport_code, terminal, gate_number, gate_blocked_until)
  VALUES
    (p_flight_id, v_gate_id, v_flight.source_code, v_terminal, v_gate_number, v_blocked_until);

  UPDATE flights
     SET gate_number = v_gate_number,
         terminal    = v_terminal
   WHERE id = p_flight_id;

  RETURN QUERY SELECT v_gate_number, v_terminal;
END;
$$;

-- Lock down direct callers — only server admin client may invoke.
REVOKE EXECUTE ON FUNCTION public.assign_gate_for_flight(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_gate_for_flight(uuid) FROM anon, authenticated;