-- SEC-012 : journalisation des échecs d'authentification.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000012a1', 'admin.log@test.local', '{"full_name":"Admin"}'),
  ('00000000-0000-0000-0000-0000000012e1', 'apprenant.log@test.local', '{"full_name":"A"}');
set local session_replication_role = replica;
update public.users set role = 'admin' where id = '00000000-0000-0000-0000-0000000012a1';
set local session_replication_role = origin;

-- Visiteur anonyme qui échoue à se connecter
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
set local request.headers = '{"x-forwarded-for":"203.0.113.7, 10.0.0.1","user-agent":"Mozilla/5.0 Test"}';

select lives_ok($$select public.log_auth_failure('  Victime@Exemple.FR ', 'invalid_credentials')$$,
  'un visiteur anonyme peut signaler un échec de connexion');
select lives_ok($$select public.log_auth_failure('x@exemple.fr', '<script>')$$,
  'un motif inconnu est accepté mais normalisé');
select throws_ok($$select count(*) from public.auth_failures$$, '42501', null,
  'un visiteur anonyme ne lit pas le journal');
select throws_ok($$insert into public.auth_failures (email_hash, reason) values ('x', 'other')$$, '42501', null,
  'le journal ne peut pas être écrit directement');

-- Protection contre l'inondation : au-delà de 20 signalements par minute et par IP, ignorés
select lives_ok($$select public.log_auth_failure('flood' || g || '@exemple.fr', 'invalid_credentials') from generate_series(1, 40) g$$,
  'un envoi massif ne provoque pas d''erreur');

reset role;
select is((select count(*)::int from public.auth_failures where ip = '203.0.113.7'), 20,
  'au plus 20 échecs journalisés par minute et par IP');
select ok(exists (
    select 1 from public.auth_failures
     where email_hash = encode(extensions.digest('victime@exemple.fr', 'sha256'), 'hex')
       and ip = '203.0.113.7' and user_agent = 'Mozilla/5.0 Test' and reason = 'invalid_credentials')
  and not exists (select 1 from public.auth_failures where email_hash like '%@%' or reason = '<script>'),
  'email haché (normalisé), IP client, user-agent et motif enregistrés ; aucun email en clair');

-- Apprenant connecté
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000012e1","role":"authenticated"}';
select is((select count(*)::int from public.auth_failures), 0, 'un apprenant ne lit pas le journal');

-- Admin
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000012a1","role":"authenticated"}';
select is((select count(*)::int from public.auth_failures), 20, 'un admin consulte le journal');

select * from finish();
rollback;
