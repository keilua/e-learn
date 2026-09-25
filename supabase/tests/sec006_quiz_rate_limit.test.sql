-- SEC-006 : au plus 10 soumissions par utilisateur et par quiz sur une fenêtre
-- glissante de 5 minutes, appliqué côté serveur.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000006f1', 'formateur.rl@test.local', '{"full_name":"F"}'),
  ('00000000-0000-0000-0000-0000000006e1', 'apprenant.rl@test.local', '{"full_name":"A"}');
insert into public.courses (id, title, instructor_id, is_published) values
  ('10000000-0000-0000-0000-0000000006c1', 'Cours RL', '00000000-0000-0000-0000-0000000006f1', true);
insert into public.modules (id, course_id, title, order_index) values
  ('20000000-0000-0000-0000-0000000006c1', '10000000-0000-0000-0000-0000000006c1', 'M', 0);
insert into public.quizzes (id, module_id, title) values
  ('40000000-0000-0000-0000-0000000006a1', '20000000-0000-0000-0000-0000000006c1', 'Quiz 1'),
  ('40000000-0000-0000-0000-0000000006a2', '20000000-0000-0000-0000-0000000006c1', 'Quiz 2'),
  ('40000000-0000-0000-0000-0000000006a3', '20000000-0000-0000-0000-0000000006c1', 'Quiz 3');
insert into public.questions (quiz_id, question_text, question_type, points, order_index)
select id, 'Q', 'short_answer', 1, 0 from public.quizzes where module_id = '20000000-0000-0000-0000-0000000006c1';

-- 10 tentatives anciennes (hors fenêtre) sur le quiz 3.
insert into public.quiz_attempts (user_id, quiz_id, score, max_score, is_passed, started_at, completed_at)
select '00000000-0000-0000-0000-0000000006e1', '40000000-0000-0000-0000-0000000006a3', 0, 1, false,
       now() - interval '6 minutes', now() - interval '6 minutes'
  from generate_series(1, 10);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000006e1","role":"authenticated"}';

select lives_ok(
  $$select public.submit_quiz_attempt('40000000-0000-0000-0000-0000000006a1', '{}') from generate_series(1, 10)$$,
  '10 soumissions en 5 minutes sont acceptées');

select throws_ok(
  $$select public.submit_quiz_attempt('40000000-0000-0000-0000-0000000006a1', '{}')$$,
  'PT429', null, 'la 11e soumission dans la fenêtre est refusée (HTTP 429)');

select is(
  (select count(*)::int from public.quiz_attempts
    where quiz_id = '40000000-0000-0000-0000-0000000006a1'
      and user_id = '00000000-0000-0000-0000-0000000006e1'),
  10, 'la soumission refusée n''est pas enregistrée');

select lives_ok(
  $$select public.submit_quiz_attempt('40000000-0000-0000-0000-0000000006a2', '{}')$$,
  'la limite est propre à chaque quiz');

select lives_ok(
  $$select public.submit_quiz_attempt('40000000-0000-0000-0000-0000000006a3', '{}')$$,
  'les tentatives de plus de 5 minutes ne comptent plus (fenêtre glissante)');

select * from finish();
rollback;
