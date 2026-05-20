
-- AIRLINES
create table public.airlines (
  code text primary key,
  name text not null,
  logo_url text,
  price_multiplier numeric not null default 1.0,
  created_at timestamptz not null default now()
);
alter table public.airlines enable row level security;
create policy "anyone reads airlines catalog" on public.airlines for select using (true);
create policy "admins manage airlines catalog" on public.airlines for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- ROUTES
create table public.airport_routes (
  id uuid primary key default gen_random_uuid(),
  source_code text not null,
  destination_code text not null,
  distance_km integer not null,
  duration_minutes integer not null,
  unique (source_code, destination_code)
);
alter table public.airport_routes enable row level security;
create policy "anyone reads routes" on public.airport_routes for select using (true);
create policy "admins manage routes" on public.airport_routes for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- FLIGHTS
create table public.flights (
  id uuid primary key default gen_random_uuid(),
  flight_number text not null,
  airline_code text not null references public.airlines(code),
  aircraft_type text not null,
  source_code text not null,
  destination_code text not null,
  departure_datetime timestamptz not null,
  arrival_datetime timestamptz not null,
  duration_minutes integer not null,
  number_of_stops integer not null default 0,
  economy_price numeric not null,
  premium_economy_price numeric not null,
  business_price numeric not null,
  first_class_price numeric not null,
  flight_status text not null default 'Scheduled',
  gate_number text,
  is_visible_on_ui boolean not null default true,
  created_at timestamptz not null default now()
);
create index flights_search_idx on public.flights (source_code, destination_code, departure_datetime);
create index flights_dep_idx on public.flights (departure_datetime);
alter table public.flights enable row level security;
create policy "anyone reads flights" on public.flights for select using (true);
create policy "admins manage flights" on public.flights for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- BOOKINGS
create table public.bookings (
  booking_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  flight_id uuid not null references public.flights(id) on delete restrict,
  email text not null,
  passenger_name text not null,
  passenger_age integer not null,
  passenger_phone text not null,
  passenger_passport_id text not null,
  cabin_class text not null,
  seat_number text not null,
  total_amount numeric not null,
  booking_status text not null default 'Confirmed',
  created_at timestamptz not null default now()
);
create index bookings_user_idx on public.bookings (user_id, created_at desc);
alter table public.bookings enable row level security;
create policy "users read own bookings" on public.bookings for select to authenticated
  using (auth.uid() = user_id);
create policy "users insert own bookings" on public.bookings for insert to authenticated
  with check (auth.uid() = user_id);
create policy "users update own bookings" on public.bookings for update to authenticated
  using (auth.uid() = user_id);
create policy "admins manage all bookings" on public.bookings for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- BOARDING PASSES
create table public.boarding_passes (
  booking_id text primary key references public.bookings(booking_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  flight_id uuid not null references public.flights(id) on delete restrict,
  passenger_name text not null,
  seat_number text not null,
  cabin_class text not null,
  boarding_group text not null,
  gate_number text,
  boarding_time timestamptz not null,
  qr_data text not null,
  created_at timestamptz not null default now()
);
alter table public.boarding_passes enable row level security;
create policy "users read own boarding passes" on public.boarding_passes for select to authenticated
  using (auth.uid() = user_id);
create policy "admins read all boarding passes" on public.boarding_passes for select to authenticated
  using (has_role(auth.uid(), 'admin'));

-- TRIGGER: auto-create boarding pass on booking insert
create or replace function public.create_boarding_pass_on_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flight record;
  v_group text;
begin
  select * into v_flight from public.flights where id = new.flight_id;
  if not found then return new; end if;

  v_group := case new.cabin_class
    when 'First Class' then 'A'
    when 'Business' then 'B'
    when 'Premium Economy' then 'C'
    else 'D'
  end;

  insert into public.boarding_passes (
    booking_id, user_id, flight_id, passenger_name, seat_number, cabin_class,
    boarding_group, gate_number, boarding_time, qr_data
  ) values (
    new.booking_id, new.user_id, new.flight_id, new.passenger_name, new.seat_number, new.cabin_class,
    v_group,
    coalesce(v_flight.gate_number, 'TBD'),
    v_flight.departure_datetime - interval '45 minutes',
    new.booking_id || '|' || v_flight.flight_number || '|' || new.passenger_name || '|' || new.seat_number
  )
  on conflict (booking_id) do nothing;

  return new;
end $$;

create trigger trg_create_boarding_pass
after insert on public.bookings
for each row execute function public.create_boarding_pass_on_booking();
