-- Migration de base : schéma de production E-Learn tel qu'extrait le 2026-09-25
-- (`supabase db dump --linked`, schémas public, auth [trigger] et storage [politiques, buckets]).
--
-- Cette migration est datée AVANT les correctifs 20260711* afin que la chaîne complète
-- de migrations reconstruise la base depuis zéro (`supabase db reset`).
-- En production elle doit être marquée comme déjà appliquée, JAMAIS exécutée :
--   npx supabase migration repair --status applied 20260710000000
--



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."enrollment_status" AS ENUM (
    'active',
    'completed',
    'dropped'
);


ALTER TYPE "public"."enrollment_status" OWNER TO "postgres";


CREATE TYPE "public"."question_type" AS ENUM (
    'multiple_choice',
    'true_false',
    'short_answer',
    'single_choice'
);


ALTER TYPE "public"."question_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'student',
    'instructor',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_own_account"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  delete from public.users where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;


ALTER FUNCTION "public"."delete_own_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_badge"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  badge_name text;
BEGIN
  SELECT name INTO badge_name FROM public.badges WHERE id = NEW.badge_id;
  
  INSERT INTO public.notifications (user_id, type, title, message, reference_id, reference_type)
  VALUES (NEW.user_id, 'badge', 'Badge Earned!', 'You earned a new badge: ' || badge_name, NEW.badge_id, 'badge');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_badge"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_certificate"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  student_id uuid;
  course_title text;
BEGIN
  SELECT ce.user_id, c.title INTO student_id, course_title 
  FROM public.course_enrollments ce
  JOIN public.courses c ON ce.course_id = c.id
  WHERE ce.id = NEW.enrollment_id;
  
  INSERT INTO public.notifications (user_id, type, title, message, reference_id, reference_type)
  VALUES (student_id, 'certificate', 'Certificate Ready', 'Your certificate for ' || course_title || ' is ready!', NEW.id, 'certificate');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_certificate"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_donation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  donor_name text;
BEGIN
  IF NEW.recipient_id IS NOT NULL THEN
    SELECT full_name INTO donor_name FROM public.users WHERE id = NEW.donor_id;
    
    INSERT INTO public.notifications (user_id, type, title, message, reference_id, reference_type)
    VALUES (NEW.recipient_id, 'donation', 'Donation Received', 'You received a donation of ' || NEW.amount || ' ' || NEW.currency || ' from ' || COALESCE(donor_name, 'Anonymous'), NEW.id, 'donation');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_donation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_enrollment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_instructor_id uuid;
  v_course_title text;
  v_student_name text;
BEGIN
  -- Use aliases and distinct variable names to avoid ambiguity
  SELECT c.instructor_id, c.title INTO v_instructor_id, v_course_title 
  FROM public.courses c 
  WHERE c.id = NEW.course_id;
  
  SELECT u.full_name INTO v_student_name 
  FROM public.users u 
  WHERE u.id = NEW.user_id;
  
  INSERT INTO public.notifications (user_id, type, title, message, reference_id, reference_type)
  VALUES (v_instructor_id, 'course', 'New Student', v_student_name || ' enrolled in ' || v_course_title, NEW.course_id, 'course');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_enrollment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_forum_reply"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_discussion_owner_id uuid;
  v_discussion_title text;
BEGIN
  SELECT d.user_id, d.title INTO v_discussion_owner_id, v_discussion_title 
  FROM public.discussions d 
  WHERE d.id = NEW.discussion_id;
  
  -- Don't notify if replying to own post
  IF v_discussion_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_id, reference_type)
    VALUES (v_discussion_owner_id, 'forum', 'New Reply', 'Someone replied to your discussion: ' || v_discussion_title, NEW.discussion_id, 'discussion');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_forum_reply"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("uid" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.users where id = uid and role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_role_self_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.role is distinct from old.role and not public.is_admin(auth.uid()) then
    new.role := old.role;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."prevent_role_self_escalation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid",
    "answer_text" "text" NOT NULL,
    "is_correct" boolean DEFAULT false,
    "order_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "image_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "course_id" "uuid"
);


ALTER TABLE "public"."badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certificates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_id" "uuid",
    "certificate_url" "text",
    "issued_date" timestamp with time zone DEFAULT "now"(),
    "certificate_number" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."certificates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "course_id" "uuid",
    "enrollment_date" timestamp with time zone DEFAULT "now"(),
    "completion_date" timestamp with time zone,
    "status" "public"."enrollment_status" DEFAULT 'active'::"public"."enrollment_status",
    "progress_percentage" integer DEFAULT 0
);


ALTER TABLE "public"."course_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "instructor_id" "uuid",
    "thumbnail_url" "text",
    "duration_hours" integer,
    "level" "text",
    "is_published" boolean DEFAULT false,
    "price" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "courses_level_check" CHECK (("level" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text"])))
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discussion_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "discussion_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."discussion_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discussions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_resolved" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."discussions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."donations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "donor_id" "uuid",
    "recipient_id" "uuid",
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text",
    "type" "text" NOT NULL,
    "payment_method" "text" NOT NULL,
    "payment_id" "text",
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."donations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "lesson_id" "uuid",
    "is_completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "last_accessed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lesson_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text",
    "video_url" "text",
    "resource_url" "text",
    "type" "text" DEFAULT 'text'::"text",
    "order_index" integer DEFAULT 0,
    "duration_minutes" integer DEFAULT 0,
    "is_published" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "code_language" "text" DEFAULT 'javascript'::"text",
    CONSTRAINT "lessons_type_check" CHECK (("type" = ANY (ARRAY['text'::"text", 'video'::"text", 'pdf'::"text", 'code'::"text"])))
);


ALTER TABLE "public"."lessons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "order_index" integer NOT NULL,
    "duration_minutes" integer,
    "content" "text",
    "video_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "user_id" "uuid" NOT NULL,
    "email_enabled" boolean DEFAULT true,
    "sms_enabled" boolean DEFAULT false,
    "browser_enabled" boolean DEFAULT true,
    "frequency" "text" DEFAULT 'immediate'::"text",
    "types" "jsonb" DEFAULT '{"badge": true, "forum": true, "course": true, "system": true, "donation": true, "certificate": true}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "sender_id" "uuid",
    "type" "text" NOT NULL,
    "reference_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "title" "text",
    "reference_type" "text"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid",
    "question_text" "text" NOT NULL,
    "question_type" "public"."question_type" DEFAULT 'multiple_choice'::"public"."question_type",
    "points" integer DEFAULT 1,
    "order_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "score" integer DEFAULT 0,
    "max_score" integer DEFAULT 0,
    "is_passed" boolean DEFAULT false,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."quiz_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quizzes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "passing_score" integer DEFAULT 70,
    "time_limit_minutes" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quizzes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."search_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "query" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."search_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "badge_id" "uuid",
    "earned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'student'::"public"."user_role",
    "avatar_url" "text",
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_certificate_number_key" UNIQUE ("certificate_number");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discussion_replies"
    ADD CONSTRAINT "discussion_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_user_id_lesson_id_key" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."search_history"
    ADD CONSTRAINT "search_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_badge_id_key" UNIQUE ("user_id", "badge_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_answers_question" ON "public"."answers" USING "btree" ("question_id");



CREATE INDEX "idx_certificates_enrollment" ON "public"."certificates" USING "btree" ("enrollment_id");



CREATE INDEX "idx_courses_instructor" ON "public"."courses" USING "btree" ("instructor_id");



CREATE INDEX "idx_enrollments_course" ON "public"."course_enrollments" USING "btree" ("course_id");



CREATE INDEX "idx_enrollments_user" ON "public"."course_enrollments" USING "btree" ("user_id");



CREATE INDEX "idx_modules_course" ON "public"."modules" USING "btree" ("course_id");



CREATE INDEX "idx_questions_quiz" ON "public"."questions" USING "btree" ("quiz_id");



CREATE INDEX "idx_quizzes_module" ON "public"."quizzes" USING "btree" ("module_id");



CREATE OR REPLACE TRIGGER "on_auth_user_created_preferences" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user_preferences"();



CREATE OR REPLACE TRIGGER "on_badge_earned" AFTER INSERT ON "public"."user_badges" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_badge"();



CREATE OR REPLACE TRIGGER "on_certificate_issued" AFTER INSERT ON "public"."certificates" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_certificate"();



CREATE OR REPLACE TRIGGER "on_forum_reply" AFTER INSERT ON "public"."discussion_replies" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_forum_reply"();



CREATE OR REPLACE TRIGGER "on_new_donation" AFTER INSERT ON "public"."donations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_donation"();



CREATE OR REPLACE TRIGGER "on_new_enrollment" AFTER INSERT ON "public"."course_enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_enrollment"();



CREATE OR REPLACE TRIGGER "trg_prevent_role_self_escalation" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_role_self_escalation"();



CREATE OR REPLACE TRIGGER "update_courses_updated_at" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_modules_updated_at" BEFORE UPDATE ON "public"."modules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_questions_updated_at" BEFORE UPDATE ON "public"."questions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quizzes_updated_at" BEFORE UPDATE ON "public"."quizzes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."course_enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."discussion_replies"
    ADD CONSTRAINT "discussion_replies_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_replies"
    ADD CONSTRAINT "discussion_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."search_history"
    ADD CONSTRAINT "search_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete profiles" ON "public"."users" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can update any profile" ON "public"."users" FOR UPDATE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Anyone can view answers" ON "public"."answers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((("public"."questions"
     JOIN "public"."quizzes" ON (("questions"."quiz_id" = "quizzes"."id")))
     JOIN "public"."modules" ON (("quizzes"."module_id" = "modules"."id")))
     JOIN "public"."courses" ON (("modules"."course_id" = "courses"."id")))
  WHERE (("questions"."id" = "answers"."question_id") AND (("courses"."is_published" = true) OR ("courses"."instructor_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."course_enrollments"
          WHERE (("course_enrollments"."course_id" = "courses"."id") AND ("course_enrollments"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Anyone can view badges" ON "public"."badges" FOR SELECT USING (true);



CREATE POLICY "Anyone can view discussions" ON "public"."discussions" FOR SELECT USING (true);



CREATE POLICY "Anyone can view published courses" ON "public"."courses" FOR SELECT USING ((("is_published" = true) OR ("instructor_id" = "auth"."uid"())));



CREATE POLICY "Anyone can view questions" ON "public"."questions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."quizzes"
     JOIN "public"."modules" ON (("quizzes"."module_id" = "modules"."id")))
     JOIN "public"."courses" ON (("modules"."course_id" = "courses"."id")))
  WHERE (("quizzes"."id" = "questions"."quiz_id") AND (("courses"."is_published" = true) OR ("courses"."instructor_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."course_enrollments"
          WHERE (("course_enrollments"."course_id" = "courses"."id") AND ("course_enrollments"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Anyone can view replies" ON "public"."discussion_replies" FOR SELECT USING (true);



-- État antérieur à 20260711123626_security_hardening (qui remplace cette politique)
CREATE POLICY "System can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



-- État antérieur à 20260711123626_security_hardening (qui remplace cette politique)
CREATE POLICY "Anyone can create a donation" ON "public"."donations" FOR INSERT WITH CHECK (true);



CREATE POLICY "Donors can view their own donations" ON "public"."donations" FOR SELECT USING (("auth"."uid"() = "donor_id"));



CREATE POLICY "Enrolled students can view published lessons" ON "public"."lessons" FOR SELECT USING ((("is_published" = true) AND (EXISTS ( SELECT 1
   FROM ("public"."modules" "m"
     JOIN "public"."course_enrollments" "ce" ON (("m"."course_id" = "ce"."course_id")))
  WHERE (("m"."id" = "lessons"."module_id") AND ("ce"."user_id" = "auth"."uid"()) AND (("ce"."status" = 'active'::"public"."enrollment_status") OR ("ce"."status" = 'completed'::"public"."enrollment_status")))))));



CREATE POLICY "Instructors can create badges" ON "public"."badges" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."quizzes"
     JOIN "public"."modules" ON (("quizzes"."module_id" = "modules"."id")))
     JOIN "public"."courses" ON (("modules"."course_id" = "courses"."id")))
  WHERE (("quizzes"."id" = "badges"."quiz_id") AND ("courses"."instructor_id" = "auth"."uid"())))));



CREATE POLICY "Instructors can create courses" ON "public"."courses" FOR INSERT WITH CHECK (("auth"."uid"() = "instructor_id"));



CREATE POLICY "Instructors can create quizzes" ON "public"."quizzes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."modules" "m"
     JOIN "public"."courses" "c" ON (("m"."course_id" = "c"."id")))
  WHERE (("m"."id" = "quizzes"."module_id") AND ("c"."instructor_id" = "auth"."uid"())))));



CREATE POLICY "Instructors can delete lessons" ON "public"."lessons" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."modules"
     JOIN "public"."courses" ON (("modules"."course_id" = "courses"."id")))
  WHERE (("modules"."id" = "lessons"."module_id") AND ("courses"."instructor_id" = "auth"."uid"())))));



CREATE POLICY "Instructors can delete own course quizzes" ON "public"."quizzes" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."modules" "m"
     JOIN "public"."courses" "c" ON (("m"."course_id" = "c"."id")))
  WHERE (("m"."id" = "quizzes"."module_id") AND ("c"."instructor_id" = "auth"."uid"())))));



CREATE POLICY "Instructors can delete own courses" ON "public"."courses" FOR DELETE USING (("auth"."uid"() = "instructor_id"));



CREATE POLICY "Instructors can insert lessons" ON "public"."lessons" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."modules"
     JOIN "public"."courses" ON (("modules"."course_id" = "courses"."id")))
  WHERE (("modules"."id" = "lessons"."module_id") AND ("courses"."instructor_id" = "auth"."uid"())))));



CREATE POLICY "Instructors can manage answers" ON "public"."answers" USING ((EXISTS ( SELECT 1
   FROM ((("public"."questions"
     JOIN "public"."quizzes" ON (("questions"."quiz_id" = "quizzes"."id")))
     JOIN "public"."modules" ON (("quizzes"."module_id" = "modules"."id")))
     JOIN "public"."courses" ON (("modules"."course_id" = "courses"."id")))
  WHERE (("questions"."id" = "answers"."question_id") AND ("courses"."instructor_id" = "auth"."uid"())))));



CREATE POLICY "Instructors can manage own course modules" ON "public"."modules" USING ((EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "modules"."course_id") AND ("courses"."instructor_id" = "auth"."uid"())))));



CREATE POLICY "Instructors can manage questions" ON "public"."questions" USING ((EXISTS ( SELECT 1
   FROM (("public"."quizzes"
     JOIN "public"."modules" ON (("quizzes"."module_id" = "modules"."id")))
     JOIN "public"."courses" ON (("modules"."course_id" = "courses"."id")))
  WHERE (("quizzes"."id" = "questions"."quiz_id") AND ("courses"."instructor_id" = "auth"."uid"())))));



CREATE POLICY "Instructors can resolve discussions" ON "public"."discussions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "discussions"."course_id") AND ("courses"."instructor_id" = "auth"."uid"())))));



CREATE POLICY "Instructors can update lessons" ON "public"."lessons" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."modules"
     JOIN "public"."courses" ON (("modules"."course_id" = "courses"."id")))
  WHERE (("modules"."id" = "lessons"."module_id") AND ("courses"."instructor_id" = "auth"."uid"())))));



CREATE POLICY "Instructors can update own course quizzes" ON "public"."quizzes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."modules" "m"
     JOIN "public"."courses" "c" ON (("m"."course_id" = "c"."id")))
  WHERE (("m"."id" = "quizzes"."module_id") AND ("c"."instructor_id" = "auth"."uid"())))));



CREATE POLICY "Instructors can update own courses" ON "public"."courses" FOR UPDATE USING (("auth"."uid"() = "instructor_id"));



CREATE POLICY "Instructors can view attempts for their courses" ON "public"."quiz_attempts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."quizzes"
     JOIN "public"."modules" ON (("quizzes"."module_id" = "modules"."id")))
     JOIN "public"."courses" ON (("modules"."course_id" = "courses"."id")))
  WHERE (("quizzes"."id" = "quiz_attempts"."quiz_id") AND ("courses"."instructor_id" = "auth"."uid"())))));



CREATE POLICY "Instructors can view own course lessons" ON "public"."lessons" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."modules" "m"
     JOIN "public"."courses" "c" ON (("m"."course_id" = "c"."id")))
  WHERE (("m"."id" = "lessons"."module_id") AND ("c"."instructor_id" = "auth"."uid"())))));



CREATE POLICY "Instructors can view own course quizzes" ON "public"."quizzes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."modules" "m"
     JOIN "public"."courses" "c" ON (("m"."course_id" = "c"."id")))
  WHERE (("m"."id" = "quizzes"."module_id") AND ("c"."instructor_id" = "auth"."uid"())))));



CREATE POLICY "Instructors can view own modules" ON "public"."modules" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "modules"."course_id") AND ("courses"."instructor_id" = "auth"."uid"())))));



CREATE POLICY "Recipients can view donations received" ON "public"."donations" FOR SELECT USING (("auth"."uid"() = "recipient_id"));



CREATE POLICY "Students can view quizzes" ON "public"."quizzes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."modules" "m"
     JOIN "public"."courses" "c" ON (("m"."course_id" = "c"."id")))
  WHERE (("m"."id" = "quizzes"."module_id") AND (("c"."is_published" = true) OR (EXISTS ( SELECT 1
           FROM "public"."course_enrollments" "ce"
          WHERE (("ce"."course_id" = "c"."id") AND ("ce"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can award own badges" ON "public"."user_badges" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create discussions" ON "public"."discussions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create replies" ON "public"."discussion_replies" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own discussions" ON "public"."discussions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own replies" ON "public"."discussion_replies" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own search history" ON "public"."search_history" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can enroll in courses" ON "public"."course_enrollments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own attempts" ON "public"."quiz_attempts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own certificates" ON "public"."certificates" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."course_enrollments"
  WHERE (("course_enrollments"."id" = "certificates"."enrollment_id") AND ("course_enrollments"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own notification preferences" ON "public"."notification_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own search history" ON "public"."search_history" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own lesson progress" ON "public"."lesson_progress" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own discussions" ON "public"."discussions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own enrollments" ON "public"."course_enrollments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notification preferences" ON "public"."notification_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own replies" ON "public"."discussion_replies" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view all profiles" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Users can view modules of accessible courses" ON "public"."modules" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "modules"."course_id") AND (("courses"."is_published" = true) OR ("courses"."instructor_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view own attempts" ON "public"."quiz_attempts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own certificates" ON "public"."certificates" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."course_enrollments"
  WHERE (("course_enrollments"."id" = "certificates"."enrollment_id") AND ("course_enrollments"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own enrollments" ON "public"."course_enrollments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own notification preferences" ON "public"."notification_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own search history" ON "public"."search_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own earned badges" ON "public"."user_badges" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."certificates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discussion_replies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discussions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."donations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lesson_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lessons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quizzes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."search_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































REVOKE ALL ON FUNCTION "public"."delete_own_account"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_own_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_own_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_own_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_badge"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_badge"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_badge"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_certificate"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_certificate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_certificate"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_donation"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_donation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_donation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_enrollment"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_enrollment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_enrollment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_forum_reply"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_forum_reply"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_forum_reply"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_preferences"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_preferences"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"("uid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."prevent_role_self_escalation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prevent_role_self_escalation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."answers" TO "anon";
GRANT ALL ON TABLE "public"."answers" TO "authenticated";
GRANT ALL ON TABLE "public"."answers" TO "service_role";



GRANT ALL ON TABLE "public"."badges" TO "anon";
GRANT ALL ON TABLE "public"."badges" TO "authenticated";
GRANT ALL ON TABLE "public"."badges" TO "service_role";



GRANT ALL ON TABLE "public"."certificates" TO "anon";
GRANT ALL ON TABLE "public"."certificates" TO "authenticated";
GRANT ALL ON TABLE "public"."certificates" TO "service_role";



GRANT ALL ON TABLE "public"."course_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."course_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."course_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."discussion_replies" TO "anon";
GRANT ALL ON TABLE "public"."discussion_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."discussion_replies" TO "service_role";



GRANT ALL ON TABLE "public"."discussions" TO "anon";
GRANT ALL ON TABLE "public"."discussions" TO "authenticated";
GRANT ALL ON TABLE "public"."discussions" TO "service_role";



GRANT ALL ON TABLE "public"."donations" TO "anon";
GRANT ALL ON TABLE "public"."donations" TO "authenticated";
GRANT ALL ON TABLE "public"."donations" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_progress" TO "anon";
GRANT ALL ON TABLE "public"."lesson_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_progress" TO "service_role";



GRANT ALL ON TABLE "public"."lessons" TO "anon";
GRANT ALL ON TABLE "public"."lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons" TO "service_role";



GRANT ALL ON TABLE "public"."modules" TO "anon";
GRANT ALL ON TABLE "public"."modules" TO "authenticated";
GRANT ALL ON TABLE "public"."modules" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."quizzes" TO "anon";
GRANT ALL ON TABLE "public"."quizzes" TO "authenticated";
GRANT ALL ON TABLE "public"."quizzes" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."search_history" TO "anon";
GRANT ALL ON TABLE "public"."search_history" TO "authenticated";
GRANT ALL ON TABLE "public"."search_history" TO "service_role";



GRANT ALL ON TABLE "public"."user_badges" TO "anon";
GRANT ALL ON TABLE "public"."user_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_badges" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."users" TO "anon";



GRANT SELECT("full_name") ON TABLE "public"."users" TO "anon";



GRANT SELECT("role") ON TABLE "public"."users" TO "anon";



GRANT SELECT("avatar_url") ON TABLE "public"."users" TO "anon";



GRANT SELECT("bio") ON TABLE "public"."users" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."users" TO "anon";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

































-- ---------------------------------------------------------------------------
-- auth : création automatique du profil public à l'inscription
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();


-- ---------------------------------------------------------------------------
-- storage : buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',       'avatars',       true, null,      null),
  ('lesson-pdfs',   'lesson-pdfs',   true, 104857600, '{application/pdf}'),
  ('lesson-videos', 'lesson-videos', true, 104857600, '{video/mp4,video/webm,video/quicktime,video/x-msvideo}')
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- storage : politiques sur storage.objects
-- ---------------------------------------------------------------------------
CREATE POLICY "Anyone can view PDF files" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'lesson-pdfs'::"text"));

CREATE POLICY "Anyone can view video files" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'lesson-videos'::"text"));

CREATE POLICY "Authenticated Users Can Upload Avatars" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'avatars'::"text") AND ("auth"."uid"() = "owner")));

CREATE POLICY "Authenticated users can upload PDFs" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'lesson-pdfs'::"text") AND ("auth"."role"() = 'authenticated'::"text")));

CREATE POLICY "Authenticated users can upload videos" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'lesson-videos'::"text") AND ("auth"."role"() = 'authenticated'::"text")));

CREATE POLICY "Public Access to Avatars" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'avatars'::"text"));

CREATE POLICY "Users Can Update Own Avatars" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'avatars'::"text") AND ("auth"."uid"() = "owner")));

CREATE POLICY "Users can delete their own PDF uploads" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'lesson-pdfs'::"text") AND ("auth"."uid"() = "owner")));

CREATE POLICY "Users can delete their own video uploads" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'lesson-videos'::"text") AND ("auth"."uid"() = "owner")));

CREATE POLICY "Users can update their own PDF uploads" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'lesson-pdfs'::"text") AND ("auth"."uid"() = "owner")));

CREATE POLICY "Users can update their own video uploads" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'lesson-videos'::"text") AND ("auth"."uid"() = "owner")));

