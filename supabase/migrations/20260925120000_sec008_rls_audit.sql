-- SEC-008 — Audit RLS : une politique explicite par table et par opération,
-- suppression des écritures client qui permettaient de falsifier notes, badges
-- et certificats, et table des blocs de contenu.
--
-- Convention : une opération interdite à tous les clients est matérialisée par une
-- politique RESTRICTIVE "Interdit ..." (using/with check false). Les fonctions
-- SECURITY DEFINER appartenant à postgres (propriétaire des tables) ne sont pas
-- soumises à la RLS et restent le seul chemin d'écriture pour ces opérations.
-- Tests : supabase/tests/sec008_rls.test.sql

-- ===========================================================================
-- 1. Réponses de quiz : le corrigé n'est plus lisible par les apprenants
-- ===========================================================================
-- Avant : "Anyone can view answers" exposait answers.is_correct (et le texte attendu
-- des questions à réponse courte) à tout visiteur d'un cours publié.
-- Les apprenants obtiennent désormais les choix via get_quiz_for_attempt().
drop policy if exists "Anyone can view answers" on public.answers;

create policy "Admins can view answers" on public.answers
  for select using (public.is_admin(auth.uid()));

-- ===========================================================================
-- 2. Tentatives de quiz : insertion uniquement par submit_quiz_attempt()
-- ===========================================================================
drop policy if exists "Users can insert own attempts" on public.quiz_attempts;

create policy "Admins can view all attempts" on public.quiz_attempts
  for select using (public.is_admin(auth.uid()));
create policy "Interdit : insertion directe de tentative" on public.quiz_attempts
  as restrictive for insert with check (false);
create policy "Interdit : modification de tentative" on public.quiz_attempts
  as restrictive for update using (false);
create policy "Interdit : suppression de tentative" on public.quiz_attempts
  as restrictive for delete using (false);

-- ===========================================================================
-- 3. Badges
-- ===========================================================================
drop policy if exists "Instructors can create badges" on public.badges;

create or replace function public.is_badge_owner(p_quiz_id uuid, p_course_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from courses c
     where c.instructor_id = auth.uid()
       and (c.id = p_course_id
            or c.id = (select m.course_id from quizzes q join modules m on m.id = q.module_id
                        where q.id = p_quiz_id))
  );
$$;
revoke execute on function public.is_badge_owner(uuid, uuid) from public, anon;
grant execute on function public.is_badge_owner(uuid, uuid) to authenticated;

create policy "Instructors can create badges" on public.badges
  for insert with check (public.is_badge_owner(quiz_id, course_id));
create policy "Instructors can update own badges" on public.badges
  for update using (public.is_badge_owner(quiz_id, course_id))
  with check (public.is_badge_owner(quiz_id, course_id));
create policy "Instructors can delete own badges" on public.badges
  for delete using (public.is_badge_owner(quiz_id, course_id));

-- ===========================================================================
-- 4. Badges obtenus : attribution uniquement par le serveur
-- ===========================================================================
drop policy if exists "Users can award own badges" on public.user_badges;

create policy "Admins can view all earned badges" on public.user_badges
  for select using (public.is_admin(auth.uid()));
create policy "Interdit : attribution directe de badge" on public.user_badges
  as restrictive for insert with check (false);
create policy "Interdit : modification de badge obtenu" on public.user_badges
  as restrictive for update using (false);
create policy "Interdit : suppression de badge obtenu" on public.user_badges
  as restrictive for delete using (false);

-- ===========================================================================
-- 5. Certificats : émission uniquement par le serveur
-- ===========================================================================
drop policy if exists "Users can insert own certificates" on public.certificates;

create policy "Admins can view all certificates" on public.certificates
  for select using (public.is_admin(auth.uid()));
create policy "Interdit : émission directe de certificat" on public.certificates
  as restrictive for insert with check (false);
create policy "Interdit : modification de certificat" on public.certificates
  as restrictive for update using (false);
create policy "Admins can delete certificates" on public.certificates
  for delete using (public.is_admin(auth.uid()));

-- ===========================================================================
-- 6. Inscriptions : l'état et la progression sont calculés par le serveur
-- ===========================================================================
drop policy if exists "Users can enroll in courses" on public.course_enrollments;
drop policy if exists "Users can update own enrollments" on public.course_enrollments;

create policy "Users can enroll in courses" on public.course_enrollments
  for insert with check (
    auth.uid() = user_id
    and status = 'active'
    and coalesce(progress_percentage, 0) = 0
    and completion_date is null
  );
-- Les pages formateur (liste des inscrits, statistiques) lisaient cette table sans
-- politique les y autorisant : elles recevaient une liste vide.
create policy "Instructors can view enrollments of their courses" on public.course_enrollments
  for select using (exists (
    select 1 from public.courses c
     where c.id = course_enrollments.course_id and c.instructor_id = auth.uid()
  ));
create policy "Admins can view all enrollments" on public.course_enrollments
  for select using (public.is_admin(auth.uid()));
create policy "Interdit : modification directe d'inscription" on public.course_enrollments
  as restrictive for update using (false);
create policy "Admins can delete enrollments" on public.course_enrollments
  for delete using (public.is_admin(auth.uid()));

-- ===========================================================================
-- 7. Progression des leçons
-- ===========================================================================
-- Avant : une politique ALL permettait de valider n'importe quelle leçon, y compris
-- d'un cours non suivi. La sous-requête sur lessons applique la RLS de lessons.
drop policy if exists "Users can manage own lesson progress" on public.lesson_progress;

create policy "Users can view own lesson progress" on public.lesson_progress
  for select using (auth.uid() = user_id);
create policy "Instructors can view progress in their courses" on public.lesson_progress
  for select using (exists (
    select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
     where l.id = lesson_progress.lesson_id and c.instructor_id = auth.uid()
  ));
create policy "Users can track progress on accessible lessons" on public.lesson_progress
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.lessons l where l.id = lesson_progress.lesson_id)
  );
create policy "Users can update own lesson progress" on public.lesson_progress
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.lessons l where l.id = lesson_progress.lesson_id)
  );
create policy "Users can delete own lesson progress" on public.lesson_progress
  for delete using (auth.uid() = user_id);

-- ===========================================================================
-- 8. Notifications : l'expéditeur est toujours l'utilisateur connecté
-- ===========================================================================
drop policy if exists "Authenticated users can create notifications" on public.notifications;

create policy "Users can send notifications as themselves" on public.notifications
  for insert with check (auth.uid() is not null and sender_id = auth.uid());
create policy "Users can delete own notifications" on public.notifications
  for delete using (auth.uid() = user_id);

-- ===========================================================================
-- 9. Opérations interdites rendues explicites sur les autres tables
-- ===========================================================================
create policy "Interdit : modification de don" on public.donations
  as restrictive for update using (false);
create policy "Interdit : suppression de don" on public.donations
  as restrictive for delete using (false);

create policy "Users can delete own notification preferences" on public.notification_preferences
  for delete using (auth.uid() = user_id);

create policy "Interdit : modification de l'historique de recherche" on public.search_history
  as restrictive for update using (false);

-- Les profils sont créés par le trigger on_auth_user_created (SECURITY DEFINER).
create policy "Interdit : création directe de profil" on public.users
  as restrictive for insert with check (false);

-- Table de référence en lecture seule.
create policy "Anyone can view roles" on public.roles
  for select using (true);
create policy "Interdit : création de rôle" on public.roles
  as restrictive for insert with check (false);
create policy "Interdit : modification de rôle" on public.roles
  as restrictive for update using (false);
create policy "Interdit : suppression de rôle" on public.roles
  as restrictive for delete using (false);

create policy "Admins can view all courses" on public.courses
  for select using (public.is_admin(auth.uid()));

-- ===========================================================================
-- 10. Blocs de contenu
-- ===========================================================================
-- Découpage du contenu d'une leçon en blocs ordonnés. Pendant la transition, le
-- bloc d'ordre 0 est le miroir de lessons.content (trigger ci-dessous) : l'interface
-- actuelle continue de lire et d'écrire lessons.content sans changement.
create table if not exists public.content_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  block_type text not null default 'html'
    check (block_type in ('html', 'code')),
  content text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, order_index)
);

alter table public.content_blocks enable row level security;
revoke all on public.content_blocks from anon;
grant select, insert, update, delete on public.content_blocks to authenticated;

create trigger update_content_blocks_updated_at
  before update on public.content_blocks
  for each row execute function public.update_updated_at_column();

-- Lecture : mêmes droits que la leçon (la sous-requête applique la RLS de lessons :
-- apprenant inscrit à une leçon publiée, ou formateur propriétaire).
create policy "Users can view blocks of accessible lessons" on public.content_blocks
  for select using (exists (
    select 1 from public.lessons l where l.id = content_blocks.lesson_id
  ));

-- Écriture : jointure bloc -> leçon -> module -> cours, auth.uid() doit être le
-- formateur propriétaire du cours.
create policy "Instructors can insert blocks in own courses" on public.content_blocks
  for insert with check (exists (
    select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
     where l.id = content_blocks.lesson_id and c.instructor_id = auth.uid()
  ));
create policy "Instructors can update blocks in own courses" on public.content_blocks
  for update using (exists (
    select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
     where l.id = content_blocks.lesson_id and c.instructor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
     where l.id = content_blocks.lesson_id and c.instructor_id = auth.uid()
  ));
create policy "Instructors can delete blocks in own courses" on public.content_blocks
  for delete using (exists (
    select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
     where l.id = content_blocks.lesson_id and c.instructor_id = auth.uid()
  ));

create or replace function public.sync_lesson_content_block()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.content is null then
    delete from content_blocks where lesson_id = new.id and order_index = 0;
  else
    insert into content_blocks (lesson_id, block_type, content, order_index)
    values (new.id, case when new.type = 'code' then 'code' else 'html' end, new.content, 0)
    on conflict (lesson_id, order_index)
    do update set content = excluded.content, block_type = excluded.block_type;
  end if;
  return new;
end;
$$;
revoke execute on function public.sync_lesson_content_block() from public, anon, authenticated;

create trigger sync_lesson_content_block
  after insert or update of content, type on public.lessons
  for each row execute function public.sync_lesson_content_block();

-- Reprise de l'existant.
insert into public.content_blocks (lesson_id, block_type, content, order_index)
select id, case when type = 'code' then 'code' else 'html' end, content, 0
  from public.lessons
 where content is not null
on conflict (lesson_id, order_index) do nothing;

-- ===========================================================================
-- 11. Fonctions serveur du parcours quiz / complétion
-- ===========================================================================

-- Accès à un cours pour l'utilisateur courant : publié, suivi ou possédé.
create or replace function public.can_access_course(p_course_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from courses c
     where c.id = p_course_id
       and (c.is_published
            or c.instructor_id = auth.uid()
            or exists (select 1 from course_enrollments e
                        where e.course_id = c.id and e.user_id = auth.uid()))
  );
$$;
revoke execute on function public.can_access_course(uuid) from public, anon;
grant execute on function public.can_access_course(uuid) to authenticated;

-- Quiz à passer, SANS le corrigé : ni is_correct, ni réponses attendues des
-- questions à réponse courte.
create or replace function public.get_quiz_for_attempt(p_quiz_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_course_id uuid;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  select m.course_id into v_course_id
    from quizzes q join modules m on m.id = q.module_id
   where q.id = p_quiz_id;

  if v_course_id is null or not public.can_access_course(v_course_id) then
    raise exception 'Quiz introuvable' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
           'quiz', to_jsonb(q),
           'questions', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'id', qs.id,
                      'question_text', qs.question_text,
                      'question_type', qs.question_type,
                      'points', qs.points,
                      'order_index', qs.order_index,
                      'answers', case when qs.question_type = 'short_answer' then '[]'::jsonb
                                 else coalesce((
                                   select jsonb_agg(jsonb_build_object('id', a.id, 'answer_text', a.answer_text)
                                                    order by a.order_index)
                                     from answers a where a.question_id = qs.id), '[]'::jsonb)
                                 end)
                    order by qs.order_index)
               from questions qs where qs.quiz_id = q.id), '[]'::jsonb))
    into v_result
    from quizzes q
   where q.id = p_quiz_id;

  return v_result;
end;
$$;
revoke execute on function public.get_quiz_for_attempt(uuid) from public, anon;
grant execute on function public.get_quiz_for_attempt(uuid) to authenticated;

-- Calcul de la complétion d'un cours en une seule requête d'agrégation
-- (remplace les boucles N+1 côté client), mise à jour de la progression,
-- émission du certificat et du badge de cours. Fonction interne.
create or replace function public.complete_course_for_user(p_user_id uuid, p_course_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_enrollment course_enrollments%rowtype;
  v_total int;
  v_done int;
  v_progress int;
  v_certificate certificates%rowtype;
  v_badge badges%rowtype;
  v_course_title text;
begin
  select * into v_enrollment from course_enrollments
   where user_id = p_user_id and course_id = p_course_id
   for update;
  if not found then
    return jsonb_build_object('completed', false, 'progress', 0);
  end if;

  select count(*) filter (where kind = 'lesson') + count(*) filter (where kind = 'quiz'),
         count(*) filter (where done)
    into v_total, v_done
    from (
      select 'lesson' as kind,
             exists (select 1 from lesson_progress lp
                      where lp.lesson_id = l.id and lp.user_id = p_user_id and lp.is_completed) as done
        from lessons l join modules m on m.id = l.module_id
       where m.course_id = p_course_id and l.is_published
      union all
      select 'quiz',
             exists (select 1 from quiz_attempts qa
                      where qa.quiz_id = q.id and qa.user_id = p_user_id and qa.is_passed)
        from quizzes q join modules m on m.id = q.module_id
       where m.course_id = p_course_id
    ) items;

  v_progress := case when v_total > 0 then round(v_done * 100.0 / v_total) else 0 end;

  if v_total = 0 or v_done < v_total then
    update course_enrollments set progress_percentage = v_progress where id = v_enrollment.id;
    return jsonb_build_object('completed', false, 'progress', v_progress);
  end if;

  if v_enrollment.status = 'completed' then
    return jsonb_build_object('completed', true, 'newlyCompleted', false, 'progress', 100);
  end if;

  update course_enrollments
     set status = 'completed', completion_date = now(), progress_percentage = 100
   where id = v_enrollment.id;

  select * into v_certificate from certificates where enrollment_id = v_enrollment.id limit 1;
  if not found then
    insert into certificates (enrollment_id, certificate_number, issued_date)
    values (v_enrollment.id,
            'CERT-' || upper(to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint))
                    || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 5)),
            now())
    returning * into v_certificate;
  end if;

  select * into v_badge from badges where course_id = p_course_id limit 1;
  if not found then
    select title into v_course_title from courses where id = p_course_id;
    insert into badges (course_id, name, description, image_url)
    values (p_course_id, v_course_title || ' Master',
            'Awarded for successfully completing the course: ' || v_course_title,
            'https://images.unsplash.com/photo-1567427018141-0584cfcbf1b8?w=400&h=400&fit=crop')
    returning * into v_badge;
  end if;
  insert into user_badges (user_id, badge_id, earned_at)
  values (p_user_id, v_badge.id, now())
  on conflict (user_id, badge_id) do nothing;

  return jsonb_build_object(
    'completed', true,
    'newlyCompleted', true,
    'progress', 100,
    'certificate', to_jsonb(v_certificate),
    'badge', to_jsonb(v_badge)
  );
end;
$$;
revoke execute on function public.complete_course_for_user(uuid, uuid) from public, anon, authenticated;

-- Point d'entrée client : complétion du cours pour l'utilisateur connecté.
create or replace function public.process_course_completion(p_course_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  if not public.can_access_course(p_course_id) then
    raise exception 'Cours introuvable' using errcode = 'P0002';
  end if;

  insert into course_enrollments (user_id, course_id, status)
  values (auth.uid(), p_course_id, 'active')
  on conflict (user_id, course_id) do nothing;

  return public.complete_course_for_user(auth.uid(), p_course_id);
end;
$$;
revoke execute on function public.process_course_completion(uuid) from public, anon;
grant execute on function public.process_course_completion(uuid) to authenticated;

-- Soumission d'un quiz, notée côté serveur à partir du corrigé.
-- p_answers : { "<question_id>": "<answer_id>" | ["<answer_id>", ...] | "<texte>" }
create or replace function public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_quiz quizzes%rowtype;
  v_course_id uuid;
  v_question record;
  v_given jsonb;
  v_correct uuid[];
  v_selected uuid[];
  v_score int := 0;
  v_max int := 0;
  v_passed boolean;
  v_attempt quiz_attempts%rowtype;
  v_badge badges%rowtype;
  v_badge_awarded boolean := false;
  v_completion jsonb := null;
begin
  if v_uid is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Format de réponses invalide' using errcode = '22023';
  end if;

  select q.* into v_quiz from quizzes q where q.id = p_quiz_id;
  select m.course_id into v_course_id from modules m where m.id = v_quiz.module_id;
  if v_course_id is null or not public.can_access_course(v_course_id) then
    raise exception 'Quiz introuvable' using errcode = 'P0002';
  end if;

  insert into course_enrollments (user_id, course_id, status)
  values (v_uid, v_course_id, 'active')
  on conflict (user_id, course_id) do nothing;

  for v_question in
    select id, question_type, coalesce(points, 0) as points from questions where quiz_id = p_quiz_id
  loop
    v_max := v_max + v_question.points;
    v_given := p_answers -> v_question.id::text;

    if v_question.question_type = 'short_answer' then
      if jsonb_typeof(v_given) = 'string' and exists (
           select 1 from answers a
            where a.question_id = v_question.id
              and lower(btrim(a.answer_text)) = lower(btrim(v_given #>> '{}'))) then
        v_score := v_score + v_question.points;
      end if;
      continue;
    end if;

    select coalesce(array_agg(a.id order by a.id), '{}') into v_correct
      from answers a where a.question_id = v_question.id and a.is_correct;

    if v_question.question_type = 'multiple_choice' then
      if jsonb_typeof(v_given) <> 'array' then
        continue;
      end if;
      -- Comparaison ensembliste : ordre et doublons indifférents.
      select coalesce(array_agg(distinct x::uuid order by x::uuid), '{}') into v_selected
        from jsonb_array_elements_text(v_given) as x
       where x ~* '^[0-9a-f-]{36}$';
      if v_selected = v_correct then
        v_score := v_score + v_question.points;
      end if;
    else
      -- single_choice / true_false
      if jsonb_typeof(v_given) = 'string'
         and (v_given #>> '{}') ~* '^[0-9a-f-]{36}$'
         and (v_given #>> '{}')::uuid = any (v_correct) then
        v_score := v_score + v_question.points;
      end if;
    end if;
  end loop;

  v_passed := v_max > 0 and v_score * 100 >= coalesce(v_quiz.passing_score, 70) * v_max;

  insert into quiz_attempts (user_id, quiz_id, score, max_score, is_passed, started_at, completed_at)
  values (v_uid, p_quiz_id, v_score, v_max, v_passed, now(), now())
  returning * into v_attempt;

  if v_passed then
    select * into v_badge from badges where quiz_id = p_quiz_id limit 1;
    if found then
      insert into user_badges (user_id, badge_id, earned_at)
      values (v_uid, v_badge.id, now())
      on conflict (user_id, badge_id) do nothing;
      v_badge_awarded := found;
    end if;
    v_completion := public.complete_course_for_user(v_uid, v_course_id);
  end if;

  return jsonb_build_object(
    'attempt', to_jsonb(v_attempt),
    'badge', case when v_badge_awarded then jsonb_build_object('id', v_badge.id, 'name', v_badge.name) end,
    'completion', v_completion
  );
end;
$$;
revoke execute on function public.submit_quiz_attempt(uuid, jsonb) from public, anon;
grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;
