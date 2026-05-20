
ALTER TABLE public.passenger REPLICA IDENTITY FULL;
ALTER TABLE public.payment REPLICA IDENTITY FULL;
ALTER TABLE public.baggage REPLICA IDENTITY FULL;
ALTER TABLE public.check_in REPLICA IDENTITY FULL;
ALTER TABLE public.flight_stops REPLICA IDENTITY FULL;
ALTER TABLE public.aircraft_model REPLICA IDENTITY FULL;
ALTER TABLE public.terminal REPLICA IDENTITY FULL;
ALTER TABLE public.location REPLICA IDENTITY FULL;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['passenger','payment','baggage','check_in','flight_stops','aircraft_model','terminal','location']
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END$$;
