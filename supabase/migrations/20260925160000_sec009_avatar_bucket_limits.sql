-- SEC-009 — Le bucket des avatars impose lui-même taille et types acceptés :
-- l'API de stockage refuse un envoi hors limites même en contournant l'interface.
-- Le type réel (signature binaire) est vérifié côté client avant envoi
-- (src/lib/fileValidation.js) ; le SVG, qui peut embarquer du script, est exclu.
-- Tests : supabase/tests/sec009_avatar_bucket.test.sql

update storage.buckets
   set file_size_limit = 2097152,  -- 2 Mo
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
 where id = 'avatars';
