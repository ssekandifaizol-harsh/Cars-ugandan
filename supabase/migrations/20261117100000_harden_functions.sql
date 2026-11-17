-- Security advisor clean-up.

-- 1. Pin search_path so nobody can trick this function with a look-alike table.
alter function public.touch_updated_at() set search_path = '';

-- 2. Trigger-only functions: they run automatically on insert/update.
--    Nobody should be able to call them directly through the web API.
revoke execute on function public.audit_cars()         from public, anon, authenticated;
revoke execute on function public.enquiry_rate_limit() from public, anon, authenticated;
revoke execute on function public.handle_new_user()    from public, anon, authenticated;
revoke execute on function public.touch_updated_at()   from public, anon, authenticated;

-- 3. Role-check helpers are used by the RLS rules, so roles must still be able to run them,
--    but they don't need to be web-API endpoints. Moving them to a schema the API doesn't
--    expose hides them. Existing policies keep working (they point to the function, not its name).
create schema if not exists private;
grant usage on schema private to anon, authenticated;
alter function public.is_admin()            set schema private;
alter function public.can_manage_shop(uuid) set schema private;

-- can_manage_shop calls is_admin by name, so update it to the new place.
create or replace function private.can_manage_shop(p_shop uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select private.is_admin() or exists (
    select 1 from public.shops s
    join public.profiles p on p.id = s.owner_id
    where s.id = p_shop and s.owner_id = auth.uid() and p.role = 'owner'
  );
$$;

-- set_owner checks admin by name too.
create or replace function public.set_owner(p_email text, p_shop uuid, p_make_owner boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not private.is_admin() then
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
-- set_owner stays callable by logged-in users on purpose: it refuses anyone who isn't admin.
