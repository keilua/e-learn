-- SEC-009 : le bucket des avatars impose lui-même taille et types acceptés
-- (appliqué par l'API de stockage, même en contournant l'interface).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(2);

select is((select file_size_limit from storage.buckets where id = 'avatars'), 2097152::bigint,
  'avatars : 2 Mo maximum par fichier');
select is((select allowed_mime_types from storage.buckets where id = 'avatars'),
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  'avatars : JPEG, PNG, GIF et WebP uniquement (pas de SVG)');

select * from finish();
rollback;
