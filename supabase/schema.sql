create table if not exists public.trips (
  trip_id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  route_no text not null default '',
  from_stop text not null default '',
  to_stop text not null default '',
  fare numeric(8,2) not null default 0 check (fare >= 0),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_min numeric(8,2) not null default 0 check (duration_min >= 0),
  created_at timestamptz not null default now()
);
create index if not exists trips_user_started_idx on public.trips (user_id, started_at desc);

alter table public.trips enable row level security;
create policy "manage own trips" on public.trips
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());