-- Follow-up to 20260711123626_security_hardening.sql.
--
-- The previous migration did `REVOKE SELECT (email) ON users FROM anon`, but
-- `anon` actually held a blanket *table-level* SELECT grant (not a per-column
-- one), so the column-level REVOKE was a no-op — verified live: `anon` could
-- still read `email` after the first migration. Column-level privileges only
-- narrow an existing column-level grant; you can't subtract a column from a
-- table-level grant. Fix: revoke the table-level SELECT and re-grant only the
-- columns the app actually needs to read without a session (public course
-- browsing shows instructor name/avatar/bio, never email).

revoke select on public.users from anon;
grant select (id, full_name, avatar_url, bio, role, created_at) on public.users to anon;
