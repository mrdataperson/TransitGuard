alter table public.live_trips add column if not exists sos_notified_at timestamptz;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
drop policy if exists "manage own push subscriptions" on public.push_subscriptions;
create policy "manage own push subscriptions" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Save this device for the signed-in user (a shared phone can switch accounts)
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth_key)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = auth.uid(), p256dh = excluded.p256dh, auth_key = excluded.auth_key;
end $$;

-- A child's request can read only the devices of their own linked parents
create or replace function public.parent_push_subscriptions()
returns table (endpoint text, p256dh text, auth_key text)
language sql security definer set search_path = public stable as $$
  select s.endpoint, s.p256dh, s.auth_key
  from public.push_subscriptions s
  join public.parent_links l on l.parent_id = s.user_id
  where l.child_id = auth.uid();
$$;

-- Remove a dead device (only if it belongs to one of the caller's parents)
create or replace function public.delete_push_subscription(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from public.push_subscriptions s
  using public.parent_links l
  where s.endpoint = p_endpoint and l.parent_id = s.user_id and l.child_id = auth.uid();
$$;

revoke all on function public.save_push_subscription(text, text, text) from public;
revoke all on function public.parent_push_subscriptions() from public;
revoke all on function public.delete_push_subscription(text) from public;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
grant execute on function public.parent_push_subscriptions() to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;

notify pgrst, 'reload schema';