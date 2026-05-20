
-- Phase 1: Sync DB with original Oracle DDL/DML
-- Add missing airline
INSERT INTO public.airlines (code, name, price_multiplier) VALUES ('EK', 'Emirates', 1.5)
ON CONFLICT (code) DO NOTHING;

-- ===== Original tables =====

CREATE TABLE IF NOT EXISTS public.location (
  location_id   text PRIMARY KEY,
  city          text NOT NULL,
  state         text NOT NULL,
  country       text NOT NULL DEFAULT 'India',
  iata_code     text,
  airport_name  text,
  latitude      numeric,
  longitude     numeric,
  total_gates   integer,
  annual_pax_mn numeric,
  operator      text,
  category      text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.location ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads location" ON public.location FOR SELECT USING (true);
CREATE POLICY "admins manage location" ON public.location FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.terminal (
  terminal_number text PRIMARY KEY,
  terminal_name   text NOT NULL,
  capacity        integer,
  location_id     text NOT NULL REFERENCES public.location(location_id)
);
ALTER TABLE public.terminal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads terminal" ON public.terminal FOR SELECT USING (true);
CREATE POLICY "admins manage terminal" ON public.terminal FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.aircraft_model (
  model_id           text PRIMARY KEY,
  airline_name       text NOT NULL,
  seating_capacity   integer NOT NULL,
  iata_airline_code  text,
  aircraft_type      text,
  economy_seats      integer,
  business_seats     integer,
  first_class_seats  integer,
  economy_price      numeric,
  business_price     numeric,
  first_class_price  numeric
);
ALTER TABLE public.aircraft_model ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads aircraft_model" ON public.aircraft_model FOR SELECT USING (true);
CREATE POLICY "admins manage aircraft_model" ON public.aircraft_model FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.passenger (
  ticket_number   text PRIMARY KEY,
  passenger_name  text NOT NULL,
  age             integer,
  nationality     text,
  contact_info    text,
  email           text,
  passport_id     text,
  user_id         uuid,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.passenger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads passenger" ON public.passenger FOR SELECT USING (true);
CREATE POLICY "admins manage passenger" ON public.passenger FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.payment (
  payment_id            text PRIMARY KEY,
  ticket_number         text NOT NULL REFERENCES public.passenger(ticket_number),
  amount                numeric NOT NULL,
  payment_method        text NOT NULL,
  payment_status        text NOT NULL,
  payment_timestamp     timestamptz NOT NULL DEFAULT now(),
  booking_id            text,
  transaction_reference text,
  updated_at            timestamptz
);
ALTER TABLE public.payment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads payment" ON public.payment FOR SELECT USING (true);
CREATE POLICY "admins manage payment" ON public.payment FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.baggage (
  tag_id         text PRIMARY KEY,
  ticket_number  text NOT NULL REFERENCES public.passenger(ticket_number),
  weight         numeric,
  baggage_status text DEFAULT 'Checked-in',
  baggage_type   text DEFAULT 'Check-in',
  flight_number  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.baggage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads baggage" ON public.baggage FOR SELECT USING (true);
CREATE POLICY "admins manage baggage" ON public.baggage FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.check_in (
  checkin_id            text PRIMARY KEY,
  ticket_number         text NOT NULL REFERENCES public.passenger(ticket_number),
  flight_number         text,
  checkin_status        text DEFAULT 'Checked-in',
  checkin_method        text DEFAULT 'Online',
  boarding_pass_issued  boolean DEFAULT true,
  seat_confirmed        text,
  created_at            timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.check_in ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads check_in" ON public.check_in FOR SELECT USING (true);
CREATE POLICY "admins manage check_in" ON public.check_in FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.flight_stops (
  flight_number text NOT NULL,
  stop_number   integer NOT NULL,
  stop_location text NOT NULL,
  PRIMARY KEY (flight_number, stop_number)
);
ALTER TABLE public.flight_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads flight_stops" ON public.flight_stops FOR SELECT USING (true);
CREATE POLICY "admins manage flight_stops" ON public.flight_stops FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- ===== Extend existing tables (non-destructive) =====
ALTER TABLE public.airports ADD COLUMN IF NOT EXISTS location_id text;
ALTER TABLE public.flights  ADD COLUMN IF NOT EXISTS model_id text;
ALTER TABLE public.flights  ADD COLUMN IF NOT EXISTS origin_location_id text;
ALTER TABLE public.flights  ADD COLUMN IF NOT EXISTS destination_location_id text;
ALTER TABLE public.flights  ADD COLUMN IF NOT EXISTS is_bookable boolean NOT NULL DEFAULT true;
ALTER TABLE public.gates    ADD COLUMN IF NOT EXISTS max_aircraft_size text;
ALTER TABLE public.gates    ADD COLUMN IF NOT EXISTS terminal_number text;

-- ===== Seed original DML =====
INSERT INTO public.location (location_id, city, state, country, iata_code, airport_name) VALUES
  ('L101','Mumbai','Maharashtra','India','BOM','Chhatrapati Shivaji Maharaj International Airport'),
  ('L102','Delhi','Delhi','India','DEL','Indira Gandhi International Airport'),
  ('L103','Bengaluru','Karnataka','India','BLR','Kempegowda International Airport'),
  ('L104','Chennai','Tamil Nadu','India','MAA','Chennai International Airport'),
  ('L105','Hyderabad','Telangana','India','HYD','Rajiv Gandhi International Airport'),
  ('L106','Kolkata','West Bengal','India','CCU','Netaji Subhas Chandra Bose International Airport')
ON CONFLICT (location_id) DO NOTHING;

-- Backfill airports.location_id by IATA match
UPDATE public.airports a SET location_id = l.location_id
  FROM public.location l WHERE a.iata_code = l.iata_code AND a.location_id IS NULL;

INSERT INTO public.terminal (terminal_number, terminal_name, capacity, location_id) VALUES
  ('T1','Terminal A',5000,'L101'),
  ('T2','Terminal B',4000,'L102'),
  ('T3','Terminal C',3500,'L103'),
  ('T4','Terminal D',4500,'L104'),
  ('T5','Terminal E',3000,'L105'),
  ('T6','Terminal F',3800,'L106')
ON CONFLICT (terminal_number) DO NOTHING;

INSERT INTO public.aircraft_model (model_id, airline_name, seating_capacity, iata_airline_code, aircraft_type, economy_seats, business_seats, first_class_seats, economy_price, business_price, first_class_price) VALUES
  ('M1','Indigo',180,'6E','Airbus A320',150,24,6,4500,12000,18000),
  ('M2','Air India',220,'AI','Boeing 787-8',180,30,10,6500,16000,22000),
  ('M3','SpiceJet',160,'SG','Boeing 737-800',130,12,0,4000,10000,0),
  ('M4','Vistara',200,'UK','Airbus A320neo',160,30,10,6000,14000,20000),
  ('M5','Emirates',300,'EK','Boeing 777-300ER',220,50,30,15000,40000,80000)
ON CONFLICT (model_id) DO NOTHING;

INSERT INTO public.passenger (ticket_number, passenger_name, age, nationality, contact_info, email, passport_id) VALUES
  ('P1','Rahul Sharma',22,'Indian','9876543210','rahul.sharma@example.com','PASS001'),
  ('P2','Aisha Khan',25,'Indian','9123456780','aisha.khan@example.com','PASS002'),
  ('P3','John Smith',34,'American','9988776655','john.smith@example.com','PASS003'),
  ('P4','Priya Patel',29,'Indian','9871234567','priya.patel@example.com','PASS004'),
  ('P5','Ahmed Ali',31,'UAE','9765432109','ahmed.ali@example.com','PASS005'),
  ('P6','Meera Nair',27,'Indian','9654321876','meera.nair@example.com','PASS006')
ON CONFLICT (ticket_number) DO NOTHING;

-- Seed F101–F106 into existing flights table (shifted +70 days so they show in user search)
-- Base dates: 2026-04-10..15 09:00 → 2026-06-19..24
INSERT INTO public.flights (
  flight_number, airline_code, aircraft_type,
  source_code, destination_code,
  departure_datetime, arrival_datetime, duration_minutes,
  economy_price, premium_economy_price, business_price, first_class_price,
  flight_status, gate_number, terminal,
  model_id, origin_location_id, destination_location_id
)
SELECT * FROM (VALUES
  ('F101','6E','Airbus A320','BOM','DEL', TIMESTAMPTZ '2026-06-19 09:00:00+00', TIMESTAMPTZ '2026-06-19 11:00:00+00', 120, 4500::numeric, 5500::numeric, 12000::numeric, 18000::numeric, 'Scheduled','G1','T1','M1','L101','L102'),
  ('F102','AI','Boeing 787-8','DEL','BLR', TIMESTAMPTZ '2026-06-20 09:15:00+00', TIMESTAMPTZ '2026-06-20 12:00:00+00', 165, 6500::numeric, 8000::numeric, 16000::numeric, 22000::numeric, 'Delayed','G3','T2','M2','L102','L103'),
  ('F103','SG','Boeing 737-800','BLR','MAA', TIMESTAMPTZ '2026-06-21 07:30:00+00', TIMESTAMPTZ '2026-06-21 08:45:00+00', 75, 4000::numeric, 4800::numeric, 10000::numeric, 0::numeric, 'Cancelled','G4','T3','M3','L103','L104'),
  ('F104','UK','Airbus A320neo','MAA','HYD', TIMESTAMPTZ '2026-06-22 14:00:00+00', TIMESTAMPTZ '2026-06-22 15:30:00+00', 90, 6000::numeric, 7500::numeric, 14000::numeric, 20000::numeric, 'Scheduled','G5','T4','M4','L104','L105'),
  ('F105','EK','Boeing 777-300ER','HYD','CCU', TIMESTAMPTZ '2026-06-23 18:00:00+00', TIMESTAMPTZ '2026-06-23 20:30:00+00', 150, 15000::numeric, 18000::numeric, 40000::numeric, 80000::numeric, 'Boarding','G6','T5','M5','L105','L106'),
  ('F106','6E','Airbus A320','CCU','BOM', TIMESTAMPTZ '2026-06-24 10:00:00+00', TIMESTAMPTZ '2026-06-24 12:45:00+00', 165, 4500::numeric, 5500::numeric, 12000::numeric, 18000::numeric, 'Scheduled','G7','T6','M1','L106','L101')
) AS v(flight_number, airline_code, aircraft_type, source_code, destination_code, departure_datetime, arrival_datetime, duration_minutes, economy_price, premium_economy_price, business_price, first_class_price, flight_status, gate_number, terminal, model_id, origin_location_id, destination_location_id)
WHERE NOT EXISTS (SELECT 1 FROM public.flights f WHERE f.flight_number = v.flight_number);

-- Baggage
INSERT INTO public.baggage (tag_id, ticket_number, weight, flight_number) VALUES
  ('B1','P1',20,'F101'),
  ('B2','P2',25,'F102'),
  ('B3','P3',15,'F103'),
  ('B4','P4',22,'F104'),
  ('B5','P5',18,'F105'),
  ('B6','P6',24,'F106')
ON CONFLICT (tag_id) DO NOTHING;

-- Check-in
INSERT INTO public.check_in (checkin_id, ticket_number, flight_number, checkin_status, checkin_method, boarding_pass_issued, seat_confirmed) VALUES
  ('C1','P1','F101','Checked-in','Online',true,'12A'),
  ('C2','P2','F102','Checked-in','Counter',true,'2B'),
  ('C3','P3','F103','Cancelled','Online',false,'8C'),
  ('C4','P4','F104','Checked-in','Online',true,'15D'),
  ('C5','P5','F105','Boarding','Online',true,'10D'),
  ('C6','P6','F106','Checked-in','Counter',true,'8F')
ON CONFLICT (checkin_id) DO NOTHING;

-- Flight stops
INSERT INTO public.flight_stops (flight_number, stop_number, stop_location) VALUES
  ('F101',1,'Nagpur'),('F102',1,'Jaipur'),('F103',1,'Pune'),
  ('F104',1,'Goa'),('F105',1,'Ahmedabad'),('F106',1,'Kochi')
ON CONFLICT (flight_number, stop_number) DO NOTHING;

-- Payments
INSERT INTO public.payment (payment_id, ticket_number, amount, payment_method, payment_status, booking_id) VALUES
  ('Pay1','P1',4500,'Credit Card','Completed','BK-P1-F101'),
  ('Pay2','P2',16000,'UPI','Completed','BK-P2-F102'),
  ('Pay3','P3',4000,'Debit Card','Refunded','BK-P3-F103'),
  ('Pay4','P4',6000,'Credit Card','Completed','BK-P4-F104'),
  ('Pay5','P5',40000,'Net Banking','Refunded','BK-P5-F105'),
  ('Pay6','P6',4500,'UPI','Completed','BK-P6-F106')
ON CONFLICT (payment_id) DO NOTHING;

-- ===== Views exposing original Oracle names for the few entities backed by existing tables =====
CREATE OR REPLACE VIEW public.flight AS
  SELECT flight_number, departure_datetime AS flight_date, flight_status AS status,
         origin_location_id, destination_location_id, gate_number, model_id,
         airline_code, aircraft_type, source_code, destination_code,
         departure_datetime, arrival_datetime, duration_minutes,
         economy_price, business_price, first_class_price,
         delay_minutes, delay_reason, is_visible_on_ui, is_bookable, terminal
  FROM public.flights;

CREATE OR REPLACE VIEW public.booking AS
  SELECT booking_id, user_id, flight_id, passenger_name, passenger_age,
         passenger_passport_id, passenger_phone, email, cabin_class,
         seat_number, total_amount AS amount_paid, booking_status,
         created_at, cancelled_at, cancellation_reason
  FROM public.bookings;

CREATE OR REPLACE VIEW public.refund_info AS
  SELECT id AS refund_id, booking_id AS payment_id, refund_amount, status AS refund_status,
         refund_reason, initiated_by, initiated_at, processed_at, refund_type, user_id
  FROM public.refund_records;
