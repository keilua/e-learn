-- SEC-006 — Limitation des soumissions de quiz côté serveur :
-- 10 tentatives maximum par utilisateur et par quiz sur une fenêtre glissante de
-- 5 minutes. Appliquée par trigger sur quiz_attempts : elle couvre tout chemin
-- d'insertion (aujourd'hui uniquement submit_quiz_attempt, SEC-008).
-- L'erreur SQLSTATE PT429 est traduite par PostgREST en réponse HTTP 429.
-- Tests : supabase/tests/sec006_quiz_rate_limit.test.sql

create index if not exists idx_quiz_attempts_user_quiz_completed
  on public.quiz_attempts (user_id, quiz_id, completed_at desc);

create or replace function public.enforce_quiz_attempt_rate_limit()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  c_max_attempts constant int := 10;
  c_window constant interval := interval '5 minutes';
  v_recent int;
begin
  -- Sérialise les soumissions concurrentes d'un même utilisateur sur un même quiz.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':' || new.quiz_id::text, 0));

  select count(*) into v_recent
    from quiz_attempts
   where user_id = new.user_id
     and quiz_id = new.quiz_id
     and coalesce(completed_at, started_at) > now() - c_window;

  if v_recent >= c_max_attempts then
    raise exception 'Trop de tentatives pour ce quiz. Réessayez dans quelques minutes.'
      using errcode = 'PT429',
            hint = format('%s tentatives maximum par quiz sur 5 minutes.', c_max_attempts);
  end if;

  return new;
end;
$$;
revoke execute on function public.enforce_quiz_attempt_rate_limit() from public, anon, authenticated;

drop trigger if exists trg_quiz_attempt_rate_limit on public.quiz_attempts;
create trigger trg_quiz_attempt_rate_limit
  before insert on public.quiz_attempts
  for each row execute function public.enforce_quiz_attempt_rate_limit();
