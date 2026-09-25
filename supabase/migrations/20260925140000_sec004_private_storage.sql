-- SEC-004 — Fichiers servis uniquement par URL signée à durée limitée.
-- Les buckets deviennent privés : l'URL publique /object/public/... ne répond plus.
-- Pour obtenir une URL signée, l'utilisateur doit passer la politique SELECT
-- ci-dessous. Durées : 60 s pour les documents, 3600 s pour avatars et vidéos
-- (voir src/lib/storage.js).
-- Tests : supabase/tests/sec004_storage.test.sql
--
-- ⚠ Déploiement : appliquer cette migration APRÈS la mise en ligne du front qui
-- signe les URL, sinon les images et fichiers existants cessent de s'afficher.

update storage.buckets set public = false
 where id in ('avatars', 'lesson-pdfs', 'lesson-videos');

-- Avatars : toujours signables par tous (photo de profil affichée publiquement),
-- mais chaque URL expire.
-- (politique existante "Public Access to Avatars" conservée)

-- Documents et vidéos de leçon : accessibles au déposant, ou à qui peut lire une
-- leçon qui référence le fichier (la sous-requête applique la RLS de lessons :
-- apprenant inscrit à une leçon publiée, formateur propriétaire).
drop policy if exists "Anyone can view PDF files" on storage.objects;
drop policy if exists "Anyone can view video files" on storage.objects;

create policy "Lesson PDFs readable by lesson audience" on storage.objects
  for select using (
    bucket_id = 'lesson-pdfs'
    and (
      owner = auth.uid()
      or exists (select 1 from public.lessons l
                  where split_part(l.resource_url, '/lesson-pdfs/', 2) = storage.objects.name)
    )
  );

create policy "Lesson videos readable by lesson audience" on storage.objects
  for select using (
    bucket_id = 'lesson-videos'
    and (
      owner = auth.uid()
      or exists (select 1 from public.lessons l
                  where split_part(l.video_url, '/lesson-videos/', 2) = storage.objects.name)
    )
  );

-- Dépôt de fichiers de leçon : formateurs et admins uniquement (tout utilisateur
-- connecté pouvait jusqu'ici déposer jusqu'à 100 Mo par fichier).
drop policy if exists "Authenticated users can upload PDFs" on storage.objects;
drop policy if exists "Authenticated users can upload videos" on storage.objects;

create policy "Instructors can upload lesson PDFs" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'lesson-pdfs'
    and owner = auth.uid()
    and public.has_role(array['instructor', 'admin']::public.user_role[])
  );

create policy "Instructors can upload lesson videos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'lesson-videos'
    and owner = auth.uid()
    and public.has_role(array['instructor', 'admin']::public.user_role[])
  );
