-- =====================================================================
-- Sales + verified-buyer reviews (satisfaction surveys)
--
-- How it works:
--  1. Owner records a sale (buyer name + phone). The database makes a secret, one-time survey link.
--  2. Owner sends the link to the buyer on WhatsApp.
--  3. Buyer rates the car and service. They choose whether their comment may be shown publicly.
--  4. Nothing appears on the site until the owner approves it. He can hide or permanently delete any review.
-- Only real buyers can review: no open comment box, so no spam or fake reviews.
-- =====================================================================

alter table public.shops add column if not exists show_reviews boolean not null default true;

-- ---------- sales (private: owner and admin only) ---------------------

create table public.sales (
  id                uuid primary key default gen_random_uuid(),
  shop_id           uuid not null references public.shops(id) on delete cascade,
  car_id            uuid references public.cars(id) on delete set null,
  car_label         text not null check (char_length(car_label) between 2 and 120),
  buyer_name        text not null check (char_length(buyer_name) between 2 and 80),
  buyer_phone       text not null check (buyer_phone ~ '^\+?[0-9 ]{9,16}$'),
  sold_price        bigint check (sold_price is null or sold_price >= 0),
  sold_at           date not null default current_date,
  survey_token      uuid not null unique default gen_random_uuid(),
  survey_expires_at timestamptz not null default now() + interval '60 days',
  survey_sent_at    timestamptz,
  created_at        timestamptz not null default now()
);
create index sales_shop_idx on public.sales (shop_id, sold_at desc);

-- ---------- reviews --------------------------------------------------

create table public.reviews (
  id             uuid primary key default gen_random_uuid(),
  shop_id        uuid not null references public.shops(id) on delete cascade,
  sale_id        uuid not null unique references public.sales(id) on delete cascade,
  car_label      text not null,
  rating_overall smallint not null check (rating_overall between 1 and 5),
  rating_car     smallint check (rating_car between 1 and 5),
  rating_service smallint check (rating_service between 1 and 5),
  rating_value   smallint check (rating_value between 1 and 5),
  recommend      boolean,
  comment        text check (char_length(comment) <= 1500),
  display_name   text check (char_length(display_name) <= 60),
  allow_publish  boolean not null default false,
  status         text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  created_at     timestamptz not null default now()
);
create index reviews_public_idx on public.reviews (shop_id, status, created_at desc);

-- ---------- grants ----------------------------------------------------

revoke all on public.sales, public.reviews from anon, authenticated;
grant select, insert, update, delete on public.sales   to authenticated;          -- no anon
grant select                         on public.reviews to anon, authenticated;
grant update, delete                 on public.reviews to authenticated;          -- no direct insert: survey function only
grant all on public.sales, public.reviews to service_role;

-- ---------- RLS -------------------------------------------------------

alter table public.sales   enable row level security;
alter table public.reviews enable row level security;

create policy sales_owner on public.sales for all to authenticated
  using (private.can_manage_shop(shop_id)) with check (private.can_manage_shop(shop_id));

-- Public sees a review only if the buyer agreed AND the owner approved it.
create policy reviews_public_read on public.reviews for select to anon, authenticated
  using ((status = 'approved' and allow_publish) or private.can_manage_shop(shop_id));
create policy reviews_owner_update on public.reviews for update to authenticated
  using (private.can_manage_shop(shop_id)) with check (private.can_manage_shop(shop_id));
create policy reviews_owner_delete on public.reviews for delete to authenticated
  using (private.can_manage_shop(shop_id));

-- ---------- survey functions (the only door for buyers) ---------------
-- The link holds a random 128-bit token: impossible to guess, works once, expires after 60 days.

create or replace function public.get_survey(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s record;
begin
  select sa.*, sh.name as shop_name, sh.accent into s
  from public.sales sa join public.shops sh on sh.id = sa.shop_id
  where sa.survey_token = p_token;
  if not found then return jsonb_build_object('state', 'invalid'); end if;
  if exists (select 1 from public.reviews r where r.sale_id = s.id) then
    return jsonb_build_object('state', 'done', 'shop_name', s.shop_name);
  end if;
  if s.survey_expires_at < now() then
    return jsonb_build_object('state', 'expired', 'shop_name', s.shop_name);
  end if;
  return jsonb_build_object(
    'state', 'open',
    'shop_name', s.shop_name,
    'car_label', s.car_label,
    'first_name', split_part(s.buyer_name, ' ', 1)
  );
end $$;

create or replace function public.submit_review(
  p_token uuid, p_overall int, p_car int, p_service int, p_value int,
  p_recommend boolean, p_comment text, p_display_name text, p_allow_publish boolean
) returns text language plpgsql security definer set search_path = public as $$
declare s record;
begin
  select * into s from public.sales where survey_token = p_token for update;
  if not found then raise exception 'This survey link is not valid.' using errcode = 'P0001'; end if;
  if s.survey_expires_at < now() then raise exception 'This survey link has expired.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.reviews where sale_id = s.id) then
    raise exception 'Thank you — this survey was already completed.' using errcode = 'P0001';
  end if;
  insert into public.reviews (shop_id, sale_id, car_label, rating_overall, rating_car, rating_service, rating_value,
                              recommend, comment, display_name, allow_publish)
  values (s.shop_id, s.id, s.car_label, p_overall, p_car, p_service, p_value, p_recommend,
          nullif(trim(p_comment), ''), nullif(trim(p_display_name), ''), coalesce(p_allow_publish, false));
  return 'ok';
end $$;

revoke execute on function public.get_survey(uuid) from public;
revoke execute on function public.submit_review(uuid, int, int, int, int, boolean, text, text, boolean) from public;
grant  execute on function public.get_survey(uuid) to anon, authenticated;
grant  execute on function public.submit_review(uuid, int, int, int, int, boolean, text, text, boolean) to anon, authenticated;

-- New reviews show up live in the owner's screen.
alter publication supabase_realtime add table public.reviews;
