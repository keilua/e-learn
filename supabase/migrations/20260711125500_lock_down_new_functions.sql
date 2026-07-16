-- Postgres grants EXECUTE to PUBLIC by default on new functions. Neither
-- helper is meant to be called directly over the REST/RPC API:
-- `is_admin` is only meant to be used inside policies, and
-- `prevent_role_self_escalation` is a trigger function.
revoke execute on function public.is_admin(uuid) from public, anon;
revoke execute on function public.prevent_role_self_escalation() from public, anon, authenticated;
