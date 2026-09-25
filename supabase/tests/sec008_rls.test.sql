-- SEC-008 : politiques RLS et fonctions serveur du parcours quiz / complétion.
-- Exécution : npx supabase test db   (base locale, npx supabase start)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(24);

-- ---------------------------------------------------------------------------
-- Jeu de données
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'formateur.a@test.local', '{"full_name":"Formateur A"}'),
  ('00000000-0000-0000-0000-00000000000b', 'formateur.b@test.local', '{"full_name":"Formateur B"}'),
  ('00000000-0000-0000-0000-000000000001', 'apprenant.1@test.local', '{"full_name":"Apprenant 1"}'),
  ('00000000-0000-0000-0000-000000000002', 'apprenant.2@test.local', '{"full_name":"Apprenant 2"}');

-- Le trigger anti-escalade de rôle ignore les mises à jour hors session admin.
set local session_replication_role = replica;
update public.users set role = 'instructor'
 where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
set local session_replication_role = origin;

insert into public.courses (id, title, instructor_id, is_published) values
  ('10000000-0000-0000-0000-00000000000a', 'Cours A', '00000000-0000-0000-0000-00000000000a', true),
  ('10000000-0000-0000-0000-00000000000b', 'Cours B', '00000000-0000-0000-0000-00000000000b', true);
insert into public.modules (id, course_id, title, order_index) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Module A', 0),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'Module B', 0);
insert into public.lessons (id, module_id, title, content, is_published) values
  ('30000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'Leçon A', '<p>Contenu A</p>', true),
  ('30000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000b', 'Leçon B', '<p>Contenu B</p>', true);
insert into public.quizzes (id, module_id, title, passing_score) values
  ('40000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'Quiz A', 70);
insert into public.questions (id, quiz_id, question_text, question_type, points, order_index) values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-00000000000a', 'Choix unique', 'single_choice', 1, 0),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-00000000000a', 'Réponse courte', 'short_answer', 1, 1);
insert into public.answers (id, question_id, answer_text, is_correct, order_index) values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Bonne', true, 0),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'Mauvaise', false, 1),
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 'Paris', true, 0);
insert into public.course_enrollments (user_id, course_id, status) values
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000a', 'active');
insert into public.quiz_attempts (user_id, quiz_id, score, max_score, is_passed) values
  ('00000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-00000000000a', 0, 2, false);

-- ---------------------------------------------------------------------------
-- Couverture : une politique explicite par table et par opération
-- ---------------------------------------------------------------------------
select is(
  (select array_agg(t.relname || ':' || op order by t.relname, op)
     from pg_class t
     join pg_namespace n on n.oid = t.relnamespace
     cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as op
    where n.nspname = 'public' and t.relkind = 'r'
      and not exists (select 1 from pg_policies p
                       where p.schemaname = 'public' and p.tablename = t.relname
                         and (p.cmd = op or p.cmd = 'ALL'))),
  null,
  'chaque table publique a une politique explicite pour SELECT, INSERT, UPDATE et DELETE'
);

-- ---------------------------------------------------------------------------
-- Apprenant 1 (inscrit au cours A)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

select is((select count(*)::int from public.answers), 0,
  'un apprenant ne peut pas lire la table des réponses (corrigés)');

select ok(
  public.get_quiz_for_attempt('40000000-0000-0000-0000-00000000000a')::text not like '%is_correct%'
  and public.get_quiz_for_attempt('40000000-0000-0000-0000-00000000000a')::text not like '%Paris%',
  'get_quiz_for_attempt n''expose ni is_correct ni la réponse attendue des questions courtes');

select is(
  jsonb_array_length(public.get_quiz_for_attempt('40000000-0000-0000-0000-00000000000a') -> 'questions' -> 0 -> 'answers'),
  2, 'get_quiz_for_attempt renvoie les choix des questions à choix');

select throws_ok(
  $$insert into public.quiz_attempts (user_id, quiz_id, score, max_score, is_passed)
    values ('00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-00000000000a', 2, 2, true)$$,
  '42501', null, 'un apprenant ne peut pas insérer lui-même une tentative de quiz');

select throws_ok(
  $$insert into public.user_badges (user_id, badge_id)
    select '00000000-0000-0000-0000-000000000001', gen_random_uuid()$$,
  '42501', null, 'un apprenant ne peut pas s''attribuer un badge');

select throws_ok(
  $$insert into public.certificates (enrollment_id, certificate_number)
    select id, 'FAUX-CERT' from public.course_enrollments
     where user_id = '00000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'un apprenant ne peut pas s''émettre un certificat');

update public.course_enrollments set status = 'completed', progress_percentage = 100
 where user_id = '00000000-0000-0000-0000-000000000001';
select is(
  (select status::text from public.course_enrollments where user_id = '00000000-0000-0000-0000-000000000001'),
  'active', 'un apprenant ne peut pas marquer lui-même son inscription comme terminée');

select throws_ok(
  $$insert into public.course_enrollments (user_id, course_id, status, progress_percentage)
    values ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000b', 'completed', 100)$$,
  '42501', null, 'une inscription ne peut pas être créée directement à l''état terminé');

select is(
  (select count(*)::int from public.quiz_attempts where user_id = '00000000-0000-0000-0000-000000000002'),
  0, 'un apprenant ne peut pas lire les tentatives de quiz d''un autre');

select throws_ok(
  $$insert into public.notifications (user_id, sender_id, type, reference_id, message)
    values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a',
            'reply', gen_random_uuid(), 'usurpation')$$,
  '42501', null, 'une notification ne peut pas être envoyée au nom d''un autre utilisateur');

select is(
  (select count(*)::int from public.content_blocks where lesson_id = '30000000-0000-0000-0000-00000000000a'),
  1, 'un apprenant inscrit lit les blocs de contenu de sa leçon');

select is(
  (select count(*)::int from public.content_blocks where lesson_id = '30000000-0000-0000-0000-00000000000b'),
  0, 'un apprenant ne lit pas les blocs d''un cours auquel il n''est pas inscrit');

-- Soumission notée côté serveur ----------------------------------------------
select is(
  (public.submit_quiz_attempt('40000000-0000-0000-0000-00000000000a',
     '{"50000000-0000-0000-0000-000000000001":"60000000-0000-0000-0000-000000000002",
       "50000000-0000-0000-0000-000000000002":"Lyon"}') -> 'attempt' ->> 'is_passed')::boolean,
  false, 'submit_quiz_attempt : réponses fausses -> échec');

select is(
  public.submit_quiz_attempt('40000000-0000-0000-0000-00000000000a',
     '{"50000000-0000-0000-0000-000000000001":"60000000-0000-0000-0000-000000000001",
       "50000000-0000-0000-0000-000000000002":"  paris "}') -> 'attempt' ->> 'score',
  '2', 'submit_quiz_attempt : réponses exactes -> score maximal (casse et espaces ignorés)');

select is(
  (select count(*)::int from public.quiz_attempts where user_id = '00000000-0000-0000-0000-000000000001'),
  2, 'les tentatives soumises par la fonction serveur sont enregistrées');

select throws_ok(
  $$insert into public.lesson_progress (user_id, lesson_id, is_completed)
    values ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-00000000000b', true)$$,
  '42501', null, 'un apprenant ne peut pas valider une leçon d''un cours auquel il n''a pas accès');

select lives_ok(
  $$insert into public.lesson_progress (user_id, lesson_id, is_completed, completed_at)
    values ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-00000000000a', true, now())$$,
  'un apprenant valide une leçon de son cours');

select is(
  public.process_course_completion('10000000-0000-0000-0000-00000000000a') ->> 'completed',
  'true', 'process_course_completion : leçon validée + quiz réussi -> cours terminé');

select is(
  (select count(*)::int from public.certificates c
     join public.course_enrollments e on e.id = c.enrollment_id
    where e.user_id = '00000000-0000-0000-0000-000000000001'),
  1, 'le certificat est émis par le serveur, une seule fois');

-- ---------------------------------------------------------------------------
-- Formateur B (propriétaire du cours B uniquement)
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is_empty(
  $$update public.content_blocks set content = '<p>piraté</p>'
     where lesson_id = '30000000-0000-0000-0000-00000000000a' returning id$$,
  'un formateur ne peut pas modifier les blocs de contenu d''un autre formateur (0 ligne, sans erreur)');

select is(
  (select count(*)::int from public.course_enrollments where course_id = '10000000-0000-0000-0000-00000000000a'),
  0, 'un formateur ne voit pas les inscrits d''un cours qui n''est pas le sien');

-- ---------------------------------------------------------------------------
-- Formateur A (propriétaire du cours A)
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is(
  (select count(*)::int from public.course_enrollments where course_id = '10000000-0000-0000-0000-00000000000a'),
  1, 'un formateur voit les inscrits de son cours');

update public.lessons set content = '<p>Nouveau contenu</p>' where id = '30000000-0000-0000-0000-00000000000a';
select is(
  (select content from public.content_blocks where lesson_id = '30000000-0000-0000-0000-00000000000a'),
  '<p>Nouveau contenu</p>', 'le bloc de contenu reste synchronisé avec lessons.content');

select * from finish();
rollback;
