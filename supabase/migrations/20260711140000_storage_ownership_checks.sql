-- Follow-up security pass: the storage policies for lesson PDFs/videos only
-- checked `auth.role() = 'authenticated'`, not ownership — meaning any
-- logged-in user (e.g. a student) could overwrite or delete any other
-- user's uploaded lesson PDF/video, not just their own. The avatars bucket
-- already had the correct `auth.uid() = owner` check; PDFs/videos didn't.

drop policy if exists "Users can update their own PDF uploads" on storage.objects;
create policy "Users can update their own PDF uploads"
  on storage.objects for update
  using (bucket_id = 'lesson-pdfs' and auth.uid() = owner);

drop policy if exists "Users can delete their own PDF uploads" on storage.objects;
create policy "Users can delete their own PDF uploads"
  on storage.objects for delete
  using (bucket_id = 'lesson-pdfs' and auth.uid() = owner);

drop policy if exists "Users can update their own video uploads" on storage.objects;
create policy "Users can update their own video uploads"
  on storage.objects for update
  using (bucket_id = 'lesson-videos' and auth.uid() = owner);

drop policy if exists "Users can delete their own video uploads" on storage.objects;
create policy "Users can delete their own video uploads"
  on storage.objects for delete
  using (bucket_id = 'lesson-videos' and auth.uid() = owner);
