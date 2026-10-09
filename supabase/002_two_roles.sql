-- TransitGuard migration 2: two roles (adult, child), parent link by email, trips table.

-- 1. Roles: adult and child only
update public.profiles set role = 'adult' where role = 'parent';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('adult', 'child'));

-- 2. Profiles keep a lowercase email so links can be matched by email
alter table public.profiles add column if not exists email text;
update public.profiles p set email = lower(u.email) from auth.users u where u.id = p.id and p.email is null;
create index if not exists profiles_email_idx on public.profiles (email);

-- 3. Remove the old parent-code design
drop policy if exists "parent reads linked children" on public.profiles;
drop policy if exists "child reads linked parents" on public.profiles;
drop policy if exists "parents read linked children trips" on public.live_trips;
drop function if exists public.link_with_parent_code(text);
drop table if exists public.parent_links;
alter table public.profiles drop column if exists link_code;
drop function if exists public.gen_link_code();

-- 4. Links by parent email. parent_id stays empty until that adult has an account.
create table public.parent_links (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles(id) on delete cascade,
  parent_email text not null,
  parent_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (child_id, parent_email),
  check (parent_id is null or parent_id <> child_id)
);
create index parent_links_parent_idx on public.parent_links (parent_id);
create index parent_links_email_idx on public.parent_links (parent_email);

alter table public.parent_links enable row level security;
create policy "see own links" on public.parent_links
  for select using (child_id = auth.uid() or parent_id = auth.uid());
create policy "remove own links" on public.parent_links
  for delete using (child_id = auth.uid() or parent_id = auth.uid());

create policy "parent reads linked children" on public.profiles
  for select using (exists (
    select 1 from public.parent_links l where l.parent_id = auth.uid() and l.child_id = profiles.id));
create policy "child reads linked parents" on public.profiles
  for select using (exists (
    select 1 from public.parent_links l where l.child_id = auth.uid() and l.parent_id = profiles.id));
create policy "parents read linked children trips" on public.live_trips
  for select using (exists (
    select 1 from public.parent_links l where l.parent_id = auth.uid() and l.child_id = live_trips.child_id));

-- 5. Signup trigger: profile + (for a child) the link to the parent's email
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r text := coalesce(new.raw_user_meta_data->>'role', 'adult');
  em text := lower(new.email);
  pe text := lower(trim(coalesce(new.raw_user_meta_data->>'parent_email', '')));
begin
  if r not in ('adult', 'child') then r := 'adult'; end if;

  insert into public.profiles (id, name, role, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    r,
    em
  );

  if r = 'adult' then
    -- children who named this email as their parent get linked now
    update public.parent_links set parent_id = new.id where parent_email = em and parent_id is null;
  elsif pe <> '' and pe <> em and pe ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    insert into public.parent_links (child_id, parent_email, parent_id)
    values (new.id, pe, (select id from public.profiles where role = 'adult' and email = pe));
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A child adds another parent later
create or replace function public.add_parent_by_email(p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me public.profiles;
  pe text := lower(trim(p_email));
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'child' then
    raise exception 'Only a child account can add a parent';
  end if;
  if pe !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email';
  end if;
  if pe = me.email then
    raise exception 'That is your own email';
  end if;
  if (select count(*) from public.parent_links where child_id = me.id) >= 5 then
    raise exception 'You can link up to 5 parents';
  end if;
  insert into public.parent_links (child_id, parent_email, parent_id)
  values (me.id, pe, (select id from public.profiles where role = 'adult' and email = pe))
  on conflict (child_id, parent_email) do nothing;
end $$;

revoke all on function public.add_parent_by_email(text) from public;
grant execute on function public.add_parent_by_email(text) to authenticated;

-- 6. Trips table for the analysis page (this was the missing table)
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
drop policy if exists "manage own trips" on public.trips;
create policy "manage own trips" on public.trips
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

notify pgrst, 'reload schema';