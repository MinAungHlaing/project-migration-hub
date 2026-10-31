create or replace function public.grant_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Owner access is provisioned explicitly; public signup must never grant privileges.
  return new;
end $$;
comment on function public.grant_first_admin() is 'Legacy lifecycle hook retained as a no-op. Owner access is explicitly provisioned through protected user_roles.';