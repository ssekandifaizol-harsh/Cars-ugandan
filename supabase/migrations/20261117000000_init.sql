-- =====================================================================
-- Cars Uganda — database setup
-- Run once in Supabase > SQL Editor (or `supabase db push`).
-- Every table gets: GRANTs (who may knock on the door) + RLS (which rows).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- helpers ---------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- profiles (one row per login, holds the role) --------------

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'none' check (role in ('admin', 'owner', 'none')),
  created_at timestamptz not null default now()
);

-- New login -> new profile with NO powers. Only an admin can promote.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- shops (the owner's business details) ----------------------

create table public.shops (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references public.profiles(id) on delete set null,
  name          text not null default 'Cars Uganda' check (char_length(name) between 2 and 80),
  tagline       text check (char_length(tagline) <= 140),
  logo_path     text,
  whatsapp      text check (whatsapp is null or whatsapp ~ '^\+256[0-9]{9}$'),
  phone         text check (phone is null or phone ~ '^\+?[0-9 ]{7,16}$'),
  email         text,
  address       text,
  map_url       text,
  hours         text,
  accent        text not null default '#b91c1c' check (accent ~ '^#[0-9a-fA-F]{6}$'),
  show_usd      boolean not null default false,
  usd_rate      numeric(10, 2) check (usd_rate is null or usd_rate > 0),
  hide_prices   boolean not null default false,
  facebook      text,
  instagram     text,
  tiktok        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger shops_touch before update on public.shops
  for each row execute function public.touch_updated_at();

create or replace function public.can_manage_shop(p_shop uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.shops s
    join public.profiles p on p.id = s.owner_id
    where s.id = p_shop and s.owner_id = auth.uid() and p.role = 'owner'
  );
$$;

-- ---------- cars (public details) -------------------------------------

create table public.cars (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references public.shops(id) on delete cascade,
  slug          text not null unique check (slug ~ '^[a-z0-9-]{3,120}$'),
  make          text not null check (char_length(make) between 1 and 40),
  model         text not null check (char_length(model) between 1 and 60),
  year          int  not null check (year between 1970 and 2100),
  price         bigint check (price is null or price between 0 and 100000000000),
  negotiable    boolean not null default true,
  mileage_km    int check (mileage_km is null or mileage_km between 0 and 2000000),
  fuel          text check (fuel in ('petrol', 'diesel', 'hybrid', 'electric')),
  transmission  text check (transmission in ('automatic', 'manual')),
  body_type     text check (body_type in ('sedan', 'suv', 'hatchback', 'pickup', 'van', 'wagon', 'coupe', 'bus', 'truck')),
  engine_cc     int check (engine_cc is null or engine_cc between 50 and 10000),
  colour        text,
  drive         text check (drive in ('2wd', '4wd', 'awd')),
  seats         int check (seats is null or seats between 1 and 60),
  condition     text check (condition in ('foreign_used', 'locally_used', 'new')),
  features      text[] not null default '{}',
  description   text check (char_length(description) <= 4000),
  location      text,
  status        text not null default 'available' check (status in ('available', 'reserved', 'sold')),
  published     boolean not null default false,
  featured      boolean not null default false,
  cover_path    text,
  sold_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index cars_public_idx on public.cars (published, status, created_at desc);
create index cars_shop_idx on public.cars (shop_id);
create trigger cars_touch before update on public.cars
  for each row execute function public.touch_updated_at();

-- ---------- car_private (secret details: never shown to buyers) -------

create table public.car_private (
  car_id        uuid primary key references public.cars(id) on delete cascade,
  plate         text,
  vin           text,
  buying_price  bigint check (buying_price is null or buying_price >= 0),
  seller_name   text,
  seller_phone  text,
  notes         text check (char_length(notes) <= 4000),
  updated_at    timestamptz not null default now()
);
create trigger car_private_touch before update on public.car_private
  for each row execute function public.touch_updated_at();

-- ---------- car_photos -------------------------------------------------

create table public.car_photos (
  id         uuid primary key default gen_random_uuid(),
  car_id     uuid not null references public.cars(id) on delete cascade,
  angle      text not null,
  path       text not null,
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index car_photos_car_idx on public.car_photos (car_id, position);

-- ---------- enquiries (buyers who want a car) --------------------------

create table public.enquiries (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops(id) on delete cascade,
  car_id     uuid references public.cars(id) on delete set null,
  name       text not null check (char_length(name) between 2 and 80),
  phone      text not null check (phone ~ '^\+?[0-9 ]{9,16}$'),
  message    text check (char_length(message) <= 1000),
  status     text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);
create index enquiries_shop_idx on public.enquiries (shop_id, created_at desc);
create index enquiries_phone_idx on public.enquiries (phone, created_at desc);

-- Spam guard: max 5 enquiries per phone per hour, and 300 per shop per hour.
create or replace function public.enquiry_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.enquiries
      where phone = new.phone and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many enquiries from this number. Please try again later.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.enquiries
      where shop_id = new.shop_id and created_at > now() - interval '1 hour') >= 300 then
    raise exception 'We are receiving too many enquiries right now. Please call us instead.' using errcode = 'P0001';
  end if;
  new.status := 'new';
  new.created_at := now();
  return new;
end $$;
create trigger enquiries_rate_limit before insert on public.enquiries
  for each row execute function public.enquiry_rate_limit();

-- ---------- audit_log (who changed price / status) ---------------------

create table public.audit_log (
  id         bigint generated always as identity primary key,
  shop_id    uuid,
  actor      uuid,
  table_name text not null,
  row_id     uuid,
  action     text not null,
  changes    jsonb,
  at         timestamptz not null default now()
);

create or replace function public.audit_cars()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_log (shop_id, actor, table_name, row_id, action, changes)
    values (old.shop_id, auth.uid(), 'cars', old.id, 'delete',
            jsonb_build_object('make', old.make, 'model', old.model, 'year', old.year, 'price', old.price));
    return old;
  elsif tg_op = 'INSERT' then
    insert into public.audit_log (shop_id, actor, table_name, row_id, action, changes)
    values (new.shop_id, auth.uid(), 'cars', new.id, 'create', jsonb_build_object('price', new.price));
  elsif new.price is distinct from old.price or new.status is distinct from old.status
        or new.published is distinct from old.published then
    insert into public.audit_log (shop_id, actor, table_name, row_id, action, changes)
    values (new.shop_id, auth.uid(), 'cars', new.id, 'update', jsonb_build_object(
      'price',     jsonb_build_array(old.price, new.price),
      'status',    jsonb_build_array(old.status, new.status),
      'published', jsonb_build_array(old.published, new.published)));
    if new.status = 'sold' and old.status <> 'sold' then new.sold_at := now(); end if;
  end if;
  return new;
end $$;
create trigger cars_audit_ins after insert on public.cars
  for each row execute function public.audit_cars();
create trigger cars_audit_upd before update on public.cars
  for each row execute function public.audit_cars();
create trigger cars_audit_del after delete on public.cars
  for each row execute function public.audit_cars();

-- ---------- admin tool: give or remove owner access --------------------

create or replace function public.set_owner(p_email text, p_shop uuid, p_make_owner boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can do this' using errcode = '42501';
  end if;
  select id into v_id from public.profiles where lower(email) = lower(trim(p_email));
  if v_id is null then
    return 'No account with that email yet. Invite them first in Supabase > Authentication > Users.';
  end if;
  if p_make_owner then
    update public.profiles set role = 'owner' where id = v_id and role <> 'admin';
    update public.shops set owner_id = v_id where id = p_shop;
    return 'Owner access given.';
  else
    update public.profiles set role = 'none' where id = v_id and role = 'owner';
    update public.shops set owner_id = null where id = p_shop and owner_id = v_id;
    return 'Owner access removed.';
  end if;
end $$;

-- =====================================================================
-- GRANTS — open only the doors each role needs
-- =====================================================================

revoke all on public.profiles, public.shops, public.cars, public.car_private,
              public.car_photos, public.enquiries, public.audit_log from anon, authenticated;

grant select                         on public.shops      to anon, authenticated;
grant update                         on public.shops      to authenticated;
grant select                         on public.cars       to anon, authenticated;
grant insert, update, delete         on public.cars       to authenticated;
grant select                         on public.car_photos to anon, authenticated;
grant insert, update, delete         on public.car_photos to authenticated;
grant select, insert, update, delete on public.car_private to authenticated;   -- no anon!
grant insert                         on public.enquiries  to anon, authenticated;
grant select, update, delete         on public.enquiries  to authenticated;
grant select                         on public.profiles   to authenticated;
grant select                         on public.audit_log  to authenticated;

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

revoke execute on function public.set_owner(text, uuid, boolean) from public, anon;
grant  execute on function public.set_owner(text, uuid, boolean) to authenticated;
grant  execute on function public.is_admin() to anon, authenticated;
grant  execute on function public.can_manage_shop(uuid) to anon, authenticated;

-- =====================================================================
-- ROW LEVEL SECURITY — decide which rows
-- =====================================================================

alter table public.profiles    enable row level security;
alter table public.shops       enable row level security;
alter table public.cars        enable row level security;
alter table public.car_private enable row level security;
alter table public.car_photos  enable row level security;
alter table public.enquiries   enable row level security;
alter table public.audit_log   enable row level security;

-- profiles: see yourself; admin sees all. Nobody edits roles from the app.
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- shops: public can read; only its owner / admin can edit.
create policy shops_read   on public.shops for select to anon, authenticated using (true);
create policy shops_update on public.shops for update to authenticated
  using (public.can_manage_shop(id)) with check (public.can_manage_shop(id));

-- cars: public sees published only; owner sees and edits all of his.
create policy cars_read on public.cars for select to anon, authenticated
  using (published or public.can_manage_shop(shop_id));
create policy cars_insert on public.cars for insert to authenticated
  with check (public.can_manage_shop(shop_id));
create policy cars_update on public.cars for update to authenticated
  using (public.can_manage_shop(shop_id)) with check (public.can_manage_shop(shop_id));
create policy cars_delete on public.cars for delete to authenticated
  using (public.can_manage_shop(shop_id));

-- car_private: owner / admin only.
create policy car_private_all on public.car_private for all to authenticated
  using (public.can_manage_shop((select shop_id from public.cars c where c.id = car_id)))
  with check (public.can_manage_shop((select shop_id from public.cars c where c.id = car_id)));

-- car_photos: public sees photos of published cars.
create policy car_photos_read on public.car_photos for select to anon, authenticated
  using (exists (select 1 from public.cars c where c.id = car_id
                 and (c.published or public.can_manage_shop(c.shop_id))));
create policy car_photos_write on public.car_photos for all to authenticated
  using (public.can_manage_shop((select shop_id from public.cars c where c.id = car_id)))
  with check (public.can_manage_shop((select shop_id from public.cars c where c.id = car_id)));

-- enquiries: anyone may send one (for a real shop); only owner reads/updates.
create policy enquiries_insert on public.enquiries for insert to anon, authenticated
  with check (exists (select 1 from public.shops s where s.id = shop_id)
              and (car_id is null or exists (select 1 from public.cars c
                   where c.id = car_id and c.shop_id = enquiries.shop_id and c.published)));
create policy enquiries_read on public.enquiries for select to authenticated
  using (public.can_manage_shop(shop_id));
create policy enquiries_update on public.enquiries for update to authenticated
  using (public.can_manage_shop(shop_id)) with check (public.can_manage_shop(shop_id));
create policy enquiries_delete on public.enquiries for delete to authenticated
  using (public.can_manage_shop(shop_id));

-- audit_log: owner / admin read only. Written only by triggers.
create policy audit_read on public.audit_log for select to authenticated
  using (public.can_manage_shop(shop_id));

-- =====================================================================
-- STORAGE — car photos and shop logo. Path: {shop_id}/{car_id or 'logo'}/{file}
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('car-photos', 'car-photos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

create policy car_photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'car-photos'
              and public.can_manage_shop(((storage.foldername(name))[1])::uuid));
create policy car_photos_change on storage.objects for update to authenticated
  using (bucket_id = 'car-photos'
         and public.can_manage_shop(((storage.foldername(name))[1])::uuid));
create policy car_photos_remove on storage.objects for delete to authenticated
  using (bucket_id = 'car-photos'
         and public.can_manage_shop(((storage.foldername(name))[1])::uuid));

-- =====================================================================
-- REALTIME — owner's enquiry inbox updates live (RLS still applies)
-- =====================================================================

alter publication supabase_realtime add table public.enquiries;

-- =====================================================================
-- FIRST SHOP — the app shows this one
-- =====================================================================

insert into public.shops (name, tagline)
values ('Cars Uganda', 'Quality cars, honest prices');
