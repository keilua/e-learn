-- SEC-004 : buckets privés, lecture des fichiers de leçon limitée aux utilisateurs
-- qui ont accès à la leçon (condition nécessaire pour obtenir une URL signée).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

select is(
  (select array_agg(id order by id) from storage.buckets where public),
  null, 'aucun bucket n''est public : les fichiers ne sont servis que par URL signée');

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000004f1', 'formateur.s@test.local', '{"full_name":"Formateur"}'),
  ('00000000-0000-0000-0000-0000000004e1', 'inscrit.s@test.local', '{"full_name":"Inscrit"}'),
  ('00000000-0000-0000-0000-0000000004e2', 'externe.s@test.local', '{"full_name":"Externe"}');
set local session_replication_role = replica;
update public.users set role = 'instructor' where id = '00000000-0000-0000-0000-0000000004f1';
set local session_replication_role = origin;

insert into public.courses (id, title, instructor_id, is_published) values
  ('10000000-0000-0000-0000-0000000004c1', 'Cours S', '00000000-0000-0000-0000-0000000004f1', true);
insert into public.modules (id, course_id, title, order_index) values
  ('20000000-0000-0000-0000-0000000004c1', '10000000-0000-0000-0000-0000000004c1', 'Module', 0);
insert into public.lessons (module_id, title, type, is_published, resource_url, video_url) values
  ('20000000-0000-0000-0000-0000000004c1', 'PDF', 'pdf', true,
   'https://projet.supabase.co/storage/v1/object/public/lesson-pdfs/lessons/x/support.pdf', null),
  ('20000000-0000-0000-0000-0000000004c1', 'Vidéo', 'video', true,
   null, 'https://projet.supabase.co/storage/v1/object/public/lesson-videos/lessons/x/cours.mp4');
insert into public.course_enrollments (user_id, course_id, status) values
  ('00000000-0000-0000-0000-0000000004e1', '10000000-0000-0000-0000-0000000004c1', 'active');
insert into storage.objects (bucket_id, name, owner) values
  ('lesson-pdfs', 'lessons/x/support.pdf', '00000000-0000-0000-0000-0000000004f1'),
  ('lesson-videos', 'lessons/x/cours.mp4', '00000000-0000-0000-0000-0000000004f1'),
  ('lesson-pdfs', 'orphelin.pdf', '00000000-0000-0000-0000-0000000004f1');

set local role authenticated;

-- Apprenant inscrit
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000004e1","role":"authenticated"}';
select is((select count(*)::int from storage.objects where bucket_id = 'lesson-pdfs' and name = 'lessons/x/support.pdf'),
  1, 'un inscrit accède au PDF de sa leçon');
select is((select count(*)::int from storage.objects where bucket_id = 'lesson-videos'),
  1, 'un inscrit accède à la vidéo de sa leçon');
select is((select count(*)::int from storage.objects where name = 'orphelin.pdf'),
  0, 'un fichier rattaché à aucune leçon n''est pas lisible');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner) values ('lesson-pdfs', 'pirate.pdf', '00000000-0000-0000-0000-0000000004e1')$$,
  '42501', null, 'un apprenant ne peut pas déposer de fichier de leçon');

-- Utilisateur non inscrit
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000004e2","role":"authenticated"}';
select is((select count(*)::int from storage.objects where bucket_id in ('lesson-pdfs', 'lesson-videos')),
  0, 'un non-inscrit n''accède à aucun fichier de leçon');

-- Formateur propriétaire
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000004f1","role":"authenticated"}';
select is((select count(*)::int from storage.objects where bucket_id in ('lesson-pdfs', 'lesson-videos')),
  3, 'le formateur accède à ses fichiers, y compris non encore rattachés');
select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner) values ('lesson-pdfs', 'nouveau.pdf', '00000000-0000-0000-0000-0000000004f1')$$,
  'un formateur dépose un fichier de leçon');

-- Visiteur anonyme
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*)::int from storage.objects where bucket_id in ('lesson-pdfs', 'lesson-videos')),
  0, 'un visiteur anonyme n''accède à aucun fichier de leçon');

select * from finish();
rollback;
