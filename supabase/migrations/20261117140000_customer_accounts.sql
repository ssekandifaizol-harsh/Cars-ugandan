-- =====================================================================
-- Customer accounts, settings, one-time terms acceptance, synced favourites,
-- push notification subscriptions.
-- Anyone can sign up as a CUSTOMER. Owner/admin powers still only come from the admin.
-- =====================================================================

-- ---------- profiles: customer role + personal settings ---------------

alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'customer' where role = 'none';
alter table public.profiles alter column role set default 'customer';
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'owner', 'customer'));

alter table public.profiles
  add column if not exists phone                  text check (char_length(phone) <= 20),
  add column if not exists location               text check (char_length(location) <= 80),
  add column if not exists accepted_terms_version int,
  add column if not exists accepted_terms_at      timestamptz,
  add column if not exists notify_new_cars        boolean not null default true,
  add column if not exists notify_sound           boolean not null default true,
  add column if not exists notify_makes           text[]  not null default '{}',
  add column if not exists notify_max_price       bigint check (notify_max_price is null or notify_max_price > 0);

alter table public.profiles add constraint profiles_full_name_len check (char_length(full_name) <= 80);

-- Users may edit THESE columns of their own row only. "role" and "email" are not in the list,
-- so nobody can promote themselves, even by calling the API directly.
grant update (full_name, phone, location, accepted_terms_version, accepted_terms_at,
              notify_new_cars, notify_sound, notify_makes, notify_max_price)
  on public.profiles to authenticated;

create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- New sign-up: copy name/phone (and terms acceptance ticked on the sign-up form) into the profile.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  tv int;
begin
  begin tv := nullif(meta->>'accepted_terms_version', '')::int; exception when others then tv := null; end;
  insert into public.profiles (id, email, full_name, phone, accepted_terms_version, accepted_terms_at)
  values (
    new.id,
    coalesce(new.email, ''),
    left(nullif(trim(coalesce(meta->>'full_name', meta->>'name', '')), ''), 80),
    left(nullif(trim(coalesce(meta->>'phone', '')), ''), 20),
    tv,
    case when tv is not null then now() end
  )
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Removing an owner now makes them a normal customer again.
create or replace function public.set_owner(p_email text, p_shop uuid, p_make_owner boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not private.is_admin() then
    raise exception 'Only an admin can do this' using errcode = '42501';
  end if;
  select id into v_id from public.profiles where lower(email) = lower(trim(p_email));
  if v_id is null then
    return 'No account with that email yet. Ask them to sign up first.';
  end if;
  if p_make_owner then
    update public.profiles set role = 'owner' where id = v_id and role <> 'admin';
    update public.shops set owner_id = v_id where id = p_shop;
    return 'Owner access given.';
  else
    update public.profiles set role = 'customer' where id = v_id and role = 'owner';
    update public.shops set owner_id = null where id = p_shop and owner_id = v_id;
    return 'Owner access removed.';
  end if;
end $$;

-- ---------- favourites (saved cars, synced across devices) ------------

create table public.favourites (
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  car_id     uuid not null references public.cars(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, car_id)
);
grant select, insert, delete on public.favourites to authenticated;
grant all on public.favourites to service_role;
alter table public.favourites enable row level security;
create policy favourites_own on public.favourites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- enquiries: link to the customer so they see "My enquiries" -

alter table public.enquiries
  add column if not exists user_id uuid default auth.uid() references public.profiles(id) on delete set null;
create index if not exists enquiries_user_idx on public.enquiries (user_id, created_at desc);

drop policy if exists enquiries_insert on public.enquiries;
create policy enquiries_insert on public.enquiries for insert to anon, authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and exists (select 1 from public.shops s where s.id = shop_id)
    and (car_id is null or exists (select 1 from public.cars c
         where c.id = car_id and c.shop_id = enquiries.shop_id and c.published)));

create policy enquiries_read_own on public.enquiries for select to authenticated
  using (user_id = auth.uid());

-- ---------- push subscriptions (one per device) ------------------------

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  endpoint   text not null unique check (endpoint like 'https://%'),
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
alter table public.push_subscriptions enable row level security;
create policy push_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- cars: remember when buyers were told about a car (sent once) -

alter table public.cars add column if not exists notified_at timestamptz;

-- In-app "new car" pop-up: the app listens for cars changing (RLS still hides unpublished cars).
alter publication supabase_realtime add table public.cars;

-- ---------- right to delete (Uganda Data Protection and Privacy Act 2019) -
-- A customer can delete their own account and personal data. Owners/admins must be removed by the admin first.

create or replace function public.delete_my_account()
returns text language plpgsql security definer set search_path = public as $$
declare r text;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select role into r from public.profiles where id = auth.uid();
  if r in ('admin', 'owner') then
    raise exception 'Shop staff accounts must be removed by the admin first.' using errcode = 'P0001';
  end if;
  delete from public.enquiries where user_id = auth.uid();
  delete from auth.users where id = auth.uid(); -- cascades: profile, favourites, push subscriptions
  return 'deleted';
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;
