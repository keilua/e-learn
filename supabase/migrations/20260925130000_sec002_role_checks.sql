-- SEC-002 — Vérification du rôle côté serveur.
-- La création de cours ne vérifiait que instructor_id = auth.uid() : un apprenant
-- pouvait créer un cours via l'API en contournant le garde de route client.
-- Modules, leçons, quiz, questions et badges sont rattachés à un cours possédé :
-- verrouiller la création de cours suffit à fermer toute la chaîne.
-- Tests : supabase/tests/sec002_roles.test.sql

create or replace function public.has_role(p_roles public.user_role[])
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from users where id = auth.uid() and role = any (p_roles));
$$;
revoke execute on function public.has_role(public.user_role[]) from public, anon;
grant execute on function public.has_role(public.user_role[]) to authenticated;

drop policy if exists "Instructors can create courses" on public.courses;
create policy "Instructors can create courses" on public.courses
  for insert to authenticated with check (
    auth.uid() = instructor_id
    and public.has_role(array['instructor', 'admin']::public.user_role[])
  );
