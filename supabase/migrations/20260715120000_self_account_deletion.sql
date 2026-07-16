-- RGPD: allow a signed-in user to permanently delete their own account
-- (right to erasure). Deletes the public.users profile row explicitly for
-- safety, then the auth.users row, which cascades to any remaining
-- FK-linked data (enrollments, submissions, etc.).

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.users where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
