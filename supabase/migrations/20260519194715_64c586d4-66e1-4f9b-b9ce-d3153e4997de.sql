
-- ============ roles ============
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

drop policy if exists "view own roles" on public.user_roles;
create policy "view own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
drop policy if exists "admins manage roles" on public.user_roles;
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- auto-grant admin to the demo admin email
create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email = 'admin_demo@airportms.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
      on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user')
      on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created_role on auth.users;
create trigger on_auth_user_created_role
  after insert on auth.users
  for each row execute function public.handle_new_user_role();

-- ============ updated_at helper ============
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- ============ airports ============
create table if not exists public.airports (
  id uuid primary key default gen_random_uuid(),
  iata_code text not null unique check (char_length(iata_code) = 3),
  icao_code text unique check (icao_code is null or char_length(icao_code) = 4),
  airport_name text not null,
  city text not null,
  state text not null,
  country text not null default 'India',
  latitude numeric(10,6) not null check (latitude between -90 and 90),
  longitude numeric(10,6) not null check (longitude between -180 and 180),
  operator text,
  total_gates int check (total_gates >= 0),
  total_terminals int check (total_terminals >= 0),
  total_runways int check (total_runways >= 0),
  category text not null default 'Domestic' check (category in ('Domestic','International','Private')),
  status text not null default 'Active' check (status in ('Active','Under Construction','Proposed')),
  annual_passengers_million numeric(10,2),
  contact_phone text,
  contact_email text,
  website_url text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_airports_state on public.airports(state);
create index if not exists idx_airports_category on public.airports(category);
create index if not exists idx_airports_status on public.airports(status);

alter table public.airports enable row level security;
drop policy if exists "anyone reads active airports" on public.airports;
create policy "anyone reads active airports" on public.airports for select using (is_active = true);
drop policy if exists "admins insert airports" on public.airports;
create policy "admins insert airports" on public.airports for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "admins update airports" on public.airports;
create policy "admins update airports" on public.airports for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "admins delete airports" on public.airports;
create policy "admins delete airports" on public.airports for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

drop trigger if exists trg_airports_updated_at on public.airports;
create trigger trg_airports_updated_at before update on public.airports
  for each row execute function public.update_updated_at_column();

-- ============ services ============
create table if not exists public.airport_services (
  id uuid primary key default gen_random_uuid(),
  airport_id uuid not null references public.airports(id) on delete cascade,
  service_name text not null,
  is_available boolean not null default true,
  unique (airport_id, service_name)
);
alter table public.airport_services enable row level security;
drop policy if exists "anyone reads services" on public.airport_services;
create policy "anyone reads services" on public.airport_services for select using (true);
drop policy if exists "admins manage services" on public.airport_services;
create policy "admins manage services" on public.airport_services for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ airlines ============
create table if not exists public.airport_airlines (
  id uuid primary key default gen_random_uuid(),
  airport_id uuid not null references public.airports(id) on delete cascade,
  airline_code text not null,
  airline_name text,
  is_active boolean not null default true,
  unique (airport_id, airline_code)
);
alter table public.airport_airlines enable row level security;
drop policy if exists "anyone reads airlines" on public.airport_airlines;
create policy "anyone reads airlines" on public.airport_airlines for select using (true);
drop policy if exists "admins manage airlines" on public.airport_airlines;
create policy "admins manage airlines" on public.airport_airlines for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ seed ============
insert into public.airports
(iata_code, icao_code, airport_name, city, state, latitude, longitude, operator, total_gates, total_terminals, total_runways, category, status, annual_passengers_million) values
('HYD','VOHS','Rajiv Gandhi International Airport','Hyderabad','Telangana',17.356900,78.468900,'GHIAL',42,1,2,'International','Active',23),
('VTZ','VOVZ','Visakhapatnam International Airport','Visakhapatnam','Andhra Pradesh',17.910000,83.228400,'Airports Authority of India',8,1,1,'International','Active',3),
('GAU','VEGT','Lokpriya Gopinath Bordoloi International Airport','Guwahati','Assam',26.143500,91.586900,'Airports Authority of India',10,1,1,'International','Active',3.5),
('DIB','VEMN','Dibrugarh Airport','Dibrugarh','Assam',27.804400,95.015900,'Airports Authority of India',4,1,1,'Domestic','Active',null),
('IXS','VEKU','Silchar Airport','Silchar','Assam',24.817900,92.976400,'Airports Authority of India',4,1,1,'Domestic','Active',null),
('PAT','VEPT','Jay Prakash Narayan International Airport','Patna','Bihar',25.589700,84.923200,'Airports Authority of India',6,1,1,'International','Active',null),
('GAY','VEGY','Gaya Airport','Gaya','Bihar',24.763400,84.954700,'Airports Authority of India',2,1,1,'Domestic','Active',null),
('RPR','VARP','Swami Vivekananda Airport','Raipur','Chhattisgarh',21.180500,81.397700,'Airports Authority of India',6,1,1,'Domestic','Active',null),
('GOI','VOGO','Dabolim Airport','Goa','Goa',15.381300,73.831400,'Airports Authority of India',6,1,1,'International','Active',4),
('AMD','VAAH','Sardar Vallabhbhai Patel International Airport','Ahmedabad','Gujarat',23.082500,72.627000,'Adani Airports',32,2,2,'International','Active',8),
('STV','VASU','Surat International Airport','Surat','Gujarat',21.081300,72.847900,'Adani Airports',10,1,1,'International','Active',null),
('BDQ','VABO','Vadodara Airport','Vadodara','Gujarat',22.323500,73.227300,'Airports Authority of India',6,1,1,'Domestic','Active',null),
('DEL','VIDP','Indira Gandhi International Airport','New Delhi','Delhi',28.556200,77.100000,'Delhi International Airport Limited',85,4,3,'International','Active',70),
('SLV','VISM','Shimla Airport','Shimla','Himachal Pradesh',31.644000,77.164500,'Airports Authority of India',2,1,1,'Domestic','Active',null),
('IXR','VERC','Birsa Munda Airport','Ranchi','Jharkhand',23.314400,85.317200,'Airports Authority of India',6,1,1,'Domestic','Active',null),
('BLR','VOBL','Kempegowda International Airport','Bangalore','Karnataka',13.191900,77.706400,'Bangalore International Airport',55,2,2,'International','Active',30),
('IXE','VOML','Mangalore International Airport','Mangalore','Karnataka',12.968900,74.891000,'Airports Authority of India',8,1,1,'International','Active',null),
('COK','VOCI','Cochin International Airport','Kochi','Kerala',10.152200,76.405600,'Cochin International Airport Limited',30,2,1,'International','Active',10),
('TRV','VOTV','Thiruvananthapuram International Airport','Thiruvananthapuram','Kerala',8.488100,76.920700,'Airports Authority of India',6,1,1,'International','Active',null),
('CCJ','VOCL','Calicut International Airport','Kozhikode','Kerala',11.138100,75.955300,'Airports Authority of India',8,1,1,'International','Active',null),
('BHO','VABP','Raja Bhoj Airport','Bhopal','Madhya Pradesh',23.284200,77.003700,'Airports Authority of India',6,1,1,'Domestic','Active',null),
('IDR','VAID','Devi Ahilya Bai Holkar Airport','Indore','Madhya Pradesh',22.719600,75.802100,'Airports Authority of India',6,1,1,'Domestic','Active',null),
('BOM','VABB','Chhatrapati Shivaji Maharaj International Airport','Mumbai','Maharashtra',19.089600,72.865600,'Mumbai International Airport',65,2,2,'International','Active',50),
('PNQ','VAPO','Pune Airport','Pune','Maharashtra',18.579700,73.919000,'Airports Authority of India',10,1,1,'International','Active',null),
('IXU','VAAU','Aurangabad Airport','Aurangabad','Maharashtra',19.876200,75.321300,'Airports Authority of India',4,1,1,'Domestic','Active',null),
('NAG','VANP','Dr. Babasaheb Ambedkar International Airport','Nagpur','Maharashtra',21.084200,79.047000,'Airports Authority of India',6,1,1,'Domestic','Active',null),
('SHL','VEBI','Shillong Airport','Shillong','Meghalaya',25.703800,91.978500,'Airports Authority of India',4,1,1,'Domestic','Active',null),
('BBI','VEBS','Biju Patnaik International Airport','Bhubaneswar','Odisha',20.574500,85.817300,'Airports Authority of India',8,1,1,'International','Active',null),
('ATQ','VIAR','Sri Guru Ram Dass Jee International Airport','Amritsar','Punjab',31.693500,74.612200,'Airports Authority of India',6,1,1,'International','Active',null),
('IXC','VICG','Chandigarh International Airport','Chandigarh','Chandigarh',30.673500,76.792200,'Airports Authority of India',8,1,1,'International','Active',null),
('JAI','VIJP','Jaipur International Airport','Jaipur','Rajasthan',26.812400,75.807600,'Airports Authority of India',6,1,1,'International','Active',null),
('JDH','VIJO','Jodhpur Airport','Jodhpur','Rajasthan',26.238900,73.024300,'Airports Authority of India',4,1,1,'Domestic','Active',null),
('MAA','VOMM','Chennai International Airport','Chennai','Tamil Nadu',12.989700,80.169500,'Airports Authority of India',40,2,2,'International','Active',20),
('CJB','VOCB','Coimbatore International Airport','Coimbatore','Tamil Nadu',11.014600,76.669100,'Airports Authority of India',6,1,1,'International','Active',null),
('TRZ','VOTR','Tiruchirappalli International Airport','Trichy','Tamil Nadu',10.807000,78.706600,'Airports Authority of India',6,1,1,'International','Active',null),
('DED','VIDN','Dehradun Airport','Dehradun','Uttarakhand',30.184700,78.177200,'Airports Authority of India',4,1,1,'Domestic','Active',null),
('LKO','VILK','Chaudhary Charan Singh International Airport','Lucknow','Uttar Pradesh',26.761000,80.893700,'Airports Authority of India',8,1,1,'International','Active',null),
('VNS','VIBN','Lal Bahadur Shastri International Airport','Varanasi','Uttar Pradesh',25.399400,82.859600,'Airports Authority of India',6,1,1,'International','Active',null),
('AGR','VIAG','Agra Airport','Agra','Uttar Pradesh',27.137400,78.046400,'Airports Authority of India',4,1,1,'Domestic','Active',null),
('CCU','VECC','Netaji Subhas Chandra Bose International Airport','Kolkata','West Bengal',22.652200,88.446700,'Airports Authority of India',40,2,2,'International','Active',20),
('IXB','VEBD','Bagdogra Airport','Siliguri','West Bengal',26.682000,88.365900,'Airports Authority of India',4,1,1,'Domestic','Active',null)
on conflict (iata_code) do nothing;

-- common services for international/hub airports
insert into public.airport_services (airport_id, service_name)
select a.id, s.name from public.airports a
cross join (values ('Customs'),('Immigration'),('Cargo'),('F&B'),('Retail'),('Lounge'),('WiFi'),('ATM'),('Parking'),('Car Rental'),('Wheelchair Access')) s(name)
where a.category = 'International'
on conflict do nothing;

insert into public.airport_services (airport_id, service_name)
select a.id, s.name from public.airports a
cross join (values ('F&B'),('WiFi'),('ATM'),('Parking'),('Wheelchair Access')) s(name)
where a.category = 'Domestic'
on conflict do nothing;
