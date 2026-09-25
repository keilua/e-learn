-- SEC-002 : les droits liés au rôle sont appliqués par la base, pas seulement par
-- le garde de route côté client (RequireRole).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local', '{"full_name":"Admin"}'),
  ('00000000-0000-0000-0000-0000000000f1', 'formateur@test.local', '{"full_name":"Formateur"}'),
  ('00000000-0000-0000-0000-0000000000e1', 'apprenant@test.local', '{"full_name":"Apprenant"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'autre@test.local', '{"full_name":"Autre"}');
set local session_replication_role = replica;
update public.users set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';
update public.users set role = 'instructor' where id = '00000000-0000-0000-0000-0000000000f1';
set local session_replication_role = origin;

-- Apprenant -----------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';

update public.users set role = 'admin' where id = '00000000-0000-0000-0000-0000000000e1';
select is((select role::text from public.users where id = '00000000-0000-0000-0000-0000000000e1'),
  'student', 'un apprenant ne peut pas s''attribuer le rôle admin');

select is_empty($$update public.users set full_name = 'x' where id = '00000000-0000-0000-0000-0000000000e2' returning id$$,
  'un apprenant ne peut pas modifier le profil d''un autre');

select is_empty($$delete from public.users where id = '00000000-0000-0000-0000-0000000000e2' returning id$$,
  'un apprenant ne peut pas supprimer un profil');

select throws_ok(
  $$insert into public.courses (title, instructor_id) values ('Cours pirate', '00000000-0000-0000-0000-0000000000e1')$$,
  '42501', null, 'un apprenant ne peut pas créer de cours, même via l''API');

select is((select count(*)::int from public.quiz_attempts), 0,
  'un apprenant ne lit pas les tentatives des autres (lecture globale réservée aux admins)');

-- Formateur -----------------------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select lives_ok(
  $$insert into public.courses (title, instructor_id) values ('Cours légitime', '00000000-0000-0000-0000-0000000000f1')$$,
  'un formateur crée un cours');

-- Admin ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
update public.users set role = 'instructor' where id = '00000000-0000-0000-0000-0000000000e2';
select is((select role::text from public.users where id = '00000000-0000-0000-0000-0000000000e2'),
  'instructor', 'un admin change le rôle d''un utilisateur');

-- Anonyme -------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$select public.is_admin('00000000-0000-0000-0000-0000000000a1')$$,
  '42501', null, 'la fonction is_admin n''est pas exposée aux visiteurs anonymes');

select * from finish();
rollback;
