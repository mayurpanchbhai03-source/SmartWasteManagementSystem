create table if not exists public.response_teams (
  city_code text not null,
  name text not null,
  latitude double precision not null check (latitude between 6 and 38),
  longitude double precision not null check (longitude between 68 and 98),
  primary key (city_code, name)
);

insert into public.response_teams (city_code, name, latitude, longitude) values
  ('new-delhi', 'MCD Central Zone Team', 28.6328, 77.2197),
  ('new-delhi', 'NDMC Sanitation Team', 28.6147, 77.1995),
  ('new-delhi', 'MCD South Zone Team', 28.5682, 77.2118),
  ('mumbai', 'BMC A Ward Response', 18.9352, 72.8355),
  ('mumbai', 'BMC G North Ward Response', 19.0178, 72.8562),
  ('mumbai', 'BMC K West Ward Response', 19.1136, 72.8267),
  ('bengaluru', 'BBMP East Zone Team', 12.9784, 77.6408),
  ('bengaluru', 'BBMP South Zone Team', 12.925, 77.5938),
  ('bengaluru', 'BBMP West Zone Team', 12.9781, 77.5581),
  ('chennai', 'GCC Central Zone Team', 13.0732, 80.2569),
  ('chennai', 'GCC North Zone Team', 13.1067, 80.2873),
  ('chennai', 'GCC South Zone Team', 13.0358, 80.24),
  ('hyderabad', 'GHMC Khairatabad Circle Team', 17.405, 78.4693),
  ('hyderabad', 'GHMC Secunderabad Circle Team', 17.4399, 78.4983),
  ('hyderabad', 'GHMC Serilingampally Circle Team', 17.4483, 78.359),
  ('kolkata', 'KMC Central Borough Team', 22.5726, 88.3568),
  ('kolkata', 'KMC North Borough Team', 22.6012, 88.369),
  ('kolkata', 'KMC South Borough Team', 22.5197, 88.35)
on conflict (city_code, name) do update
set latitude = excluded.latitude, longitude = excluded.longitude;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  city_code text not null check (city_code in ('new-delhi', 'mumbai', 'bengaluru', 'chennai', 'hyderabad', 'kolkata')),
  category text not null check (category in ('Illegal dumping', 'Overflowing bin', 'Street litter', 'Hazardous waste', 'Other')),
  title text not null check (char_length(title) between 1 and 180),
  address text not null check (char_length(address) between 1 and 220),
  latitude double precision not null check (latitude between 6 and 38),
  longitude double precision not null check (longitude between 68 and 98),
  severity text not null default 'Medium' check (severity in ('High', 'Medium', 'Low')),
  status text not null default 'Assigned' check (status in ('Assigned', 'In progress', 'Resolved')),
  authority text not null,
  photo_path text,
  created_at timestamptz not null default now(),
  foreign key (city_code, authority) references public.response_teams (city_code, name)
);

create index if not exists reports_city_created_at_idx
  on public.reports (city_code, created_at desc);

alter table public.response_teams enable row level security;
alter table public.reports enable row level security;

revoke all on table public.response_teams from anon, authenticated;
revoke all on table public.reports from anon, authenticated;
grant select on table public.response_teams to anon, authenticated;
grant select on table public.reports to anon, authenticated;
grant insert (city_code, category, title, address, latitude, longitude, severity, authority, photo_path)
  on table public.reports to anon, authenticated;

drop policy if exists "Response teams are publicly readable" on public.response_teams;
create policy "Response teams are publicly readable"
  on public.response_teams for select to anon, authenticated using (true);

drop policy if exists "Reports are publicly readable" on public.reports;
create policy "Reports are publicly readable"
  on public.reports for select to anon, authenticated using (true);

drop policy if exists "Visitors can submit reports" on public.reports;
create policy "Visitors can submit reports"
  on public.reports for insert to anon, authenticated
  with check (
    status = 'Assigned'
    and (photo_path is null or photo_path like city_code || '/%')
    and exists (
      select 1 from public.response_teams team
      where team.city_code = reports.city_code and team.name = reports.authority
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Visitors can upload report photos" on storage.objects;
create policy "Visitors can upload report photos"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'report-photos'
    and (storage.foldername(name))[1] in ('new-delhi', 'mumbai', 'bengaluru', 'chennai', 'hyderabad', 'kolkata')
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reports'
  ) then
    alter publication supabase_realtime add table public.reports;
  end if;
end
$$;