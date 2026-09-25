-- SEC-012 — Journal des échecs d'authentification.
-- Complète les journaux natifs de Supabase Auth (Dashboard > Logs > Auth) par une
-- table interrogeable en SQL et consultable par les admins de la plateforme.
-- Données minimisées (RGPD) : email haché SHA-256 (normalisé), jamais le mot de
-- passe ; conservation 90 jours.
-- Tests : supabase/tests/sec012_auth_failures.test.sql

create table if not exists public.auth_failures (
  id bigint generated always as identity primary key,
  email_hash text not null,
  ip inet,
  user_agent text,
  reason text not null check (reason in ('invalid_credentials', 'email_not_confirmed', 'user_banned', 'other')),
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_failures_created_at on public.auth_failures (created_at desc);
create index if not exists idx_auth_failures_ip_created_at on public.auth_failures (ip, created_at desc);
create index if not exists idx_auth_failures_email_hash on public.auth_failures (email_hash, created_at desc);

alter table public.auth_failures enable row level security;
revoke all on public.auth_failures from anon, authenticated;
grant select on public.auth_failures to authenticated;

create policy "Admins can view auth failures" on public.auth_failures
  for select to authenticated using (public.is_admin(auth.uid()));
create policy "Interdit : écriture directe du journal" on public.auth_failures
  as restrictive for insert with check (false);
create policy "Interdit : modification du journal" on public.auth_failures
  as restrictive for update using (false);
create policy "Interdit : suppression du journal" on public.auth_failures
  as restrictive for delete using (false);

create or replace function public.log_auth_failure(p_email text, p_reason text default 'invalid_credentials')
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  c_max_per_ip_per_minute constant int := 20;
  v_headers json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  v_ip inet;
  v_reason text := case when p_reason in ('invalid_credentials', 'email_not_confirmed', 'user_banned')
                        then p_reason else 'other' end;
begin
  if p_email is null or length(p_email) > 320 then
    return;
  end if;

  -- IP cliente : en-tête posé par le proxy de Supabase, sinon première entrée
  -- de X-Forwarded-For. Valeur indicative (un client peut forger X-Forwarded-For).
  begin
    v_ip := btrim(coalesce(v_headers ->> 'cf-connecting-ip',
                           split_part(v_headers ->> 'x-forwarded-for', ',', 1)))::inet;
  exception when others then
    v_ip := null;
  end;

  -- Un appelant ne peut pas remplir le journal : au-delà du seuil, on ignore.
  if v_ip is not null and (
       select count(*) from auth_failures
        where ip = v_ip and created_at > now() - interval '1 minute'
     ) >= c_max_per_ip_per_minute then
    return;
  end if;

  insert into auth_failures (email_hash, ip, user_agent, reason)
  values (encode(extensions.digest(lower(btrim(p_email)), 'sha256'), 'hex'),
          v_ip,
          left(v_headers ->> 'user-agent', 300),
          v_reason);

  delete from auth_failures where created_at < now() - interval '90 days';
end;
$$;
revoke execute on function public.log_auth_failure(text, text) from public;
grant execute on function public.log_auth_failure(text, text) to anon, authenticated;
