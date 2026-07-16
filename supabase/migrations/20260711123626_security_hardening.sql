-- Security hardening pass (audit via `supabase db advisors --type security`).
--
-- Fixes applied:
-- 1. Enable RLS on `lessons` and `lesson_progress` (policies existed but RLS was
--    never turned on, so they had zero effect — full open read/write).
-- 2. Stop exposing `users.email` to the `anon` role (was readable with no
--    session at all via the public REST API).
-- 3. Prevent a user from promoting themselves via `UPDATE users SET role = 'admin'`
--    (the existing UPDATE policy only checked `auth.uid() = id`, not the role field).
-- 4. Let admins manage other users' rows (needed for the new admin user
--    management screen: role changes + deletion).
-- 5. Close open INSERT policies on `donations` and `notifications` that allowed
--    forging rows for other users (`WITH CHECK (true)`).
-- 6. Pin `search_path` on SECURITY DEFINER/trigger functions (advisor WARN).

-- 1. Enable RLS where policies were defined but inactive -------------------
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;

-- Helper: is the current session an admin? SECURITY DEFINER so it can read
-- `users` regardless of the caller's own row-level access, and reused by the
-- policies below instead of repeating the same subquery everywhere.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = uid and role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

-- 2. Hide email from anonymous/unauthenticated requests ---------------------
-- full_name / avatar_url / bio / role stay public: the app relies on them for
-- unauthenticated course browsing (instructor name/avatar on course cards).
revoke select (email) on public.users from anon;

-- 3. Block role self-escalation on UPDATE -----------------------------------
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin(auth.uid()) then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_self_escalation on public.users;
create trigger trg_prevent_role_self_escalation
  before update on public.users
  for each row execute function public.prevent_role_self_escalation();

-- 4. Admin can manage any profile -------------------------------------------
drop policy if exists "Admins can update any profile" on public.users;
create policy "Admins can update any profile"
  on public.users for update
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins can delete profiles" on public.users;
create policy "Admins can delete profiles"
  on public.users for delete
  using (public.is_admin(auth.uid()));

-- 5. Close forgeable inserts --------------------------------------------------
drop policy if exists "Anyone can create a donation" on public.donations;
create policy "Authenticated users can create their own donation"
  on public.donations for insert
  with check (auth.uid() = donor_id);

drop policy if exists "System can insert notifications" on public.notifications;
create policy "Authenticated users can create notifications"
  on public.notifications for insert
  with check (auth.uid() is not null);

-- 6. Pin search_path on functions flagged by the advisor ----------------------
alter function public.handle_new_user() set search_path = public;
alter function public.update_updated_at_column() set search_path = public;
alter function public.handle_new_user_preferences() set search_path = public;
alter function public.handle_new_forum_reply() set search_path = public;
alter function public.handle_new_badge() set search_path = public;
alter function public.handle_new_certificate() set search_path = public;
alter function public.handle_new_enrollment() set search_path = public;
alter function public.handle_new_donation() set search_path = public;
