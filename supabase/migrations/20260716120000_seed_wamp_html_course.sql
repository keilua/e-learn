-- Seeds a simple starter course for the instructor with email
-- keilua.richard@gmail.com: installing WAMP on Windows, then building a
-- first HTML/CSS page (red "Hello World"), with a one-question quiz.

do $$
declare
  v_instructor_id uuid;
  v_course_id uuid;
  v_module1_id uuid;
  v_module2_id uuid;
  v_quiz_id uuid;
  v_question_id uuid;
begin
  select id into v_instructor_id from public.users where email = 'keilua.richard@gmail.com';

  if v_instructor_id is null then
    raise exception 'No user found with email keilua.richard@gmail.com';
  end if;

  update public.users
     set role = 'instructor'
   where id = v_instructor_id
     and role <> 'instructor'
     and role <> 'admin';

  insert into public.courses (title, description, level, price, duration_hours, thumbnail_url, is_published, instructor_id, created_at)
  values (
    $q$Environnement Web sous Windows : WAMP & premiers pas HTML/CSS$q$,
    $q$Installez un environnement de développement local sous Windows avec WAMP, puis créez votre toute première page HTML/CSS.$q$,
    'beginner', 0, 1, null, true, v_instructor_id, now()
  )
  returning id into v_course_id;

  -- Module 1: installing WAMP
  insert into public.modules (title, description, course_id, order_index, duration_minutes)
  values (
    $q$Installer son environnement de développement (WAMP)$q$,
    $q$Téléchargement et installation de WAMP sous Windows.$q$,
    v_course_id, 0, 15
  )
  returning id into v_module1_id;

  insert into public.lessons (title, module_id, order_index, type, is_published, duration_minutes, content)
  values (
    $q$Qu'est-ce que WAMP ?$q$,
    v_module1_id, 0, 'text', true, 5,
    $q$<h2>Qu'est-ce que WAMP ?</h2>
<p>WAMP est un environnement de développement local pour Windows regroupant :</p>
<ul>
<li><strong>W</strong>indows, le système d'exploitation</li>
<li><strong>A</strong>pache, le serveur web</li>
<li><strong>M</strong>ySQL, le système de base de données</li>
<li><strong>P</strong>HP, le langage de programmation côté serveur</li>
</ul>
<p>Il permet de développer et tester des sites web dynamiques directement sur son ordinateur, sans avoir besoin d'un hébergement en ligne.</p>$q$
  );

  insert into public.lessons (title, module_id, order_index, type, is_published, duration_minutes, content)
  values (
    $q$Télécharger et installer WAMP$q$,
    v_module1_id, 1, 'text', true, 10,
    $q$<h2>Installation de WAMP</h2>
<ol>
<li>Rendez-vous sur le site officiel <strong>wampserver.com</strong> et téléchargez la version correspondant à votre système (32 ou 64 bits).</li>
<li>Lancez l'installateur et suivez les étapes (installez les prérequis Visual C++ si demandé).</li>
<li>Choisissez le dossier d'installation, par exemple <code>C:\wamp64</code>.</li>
<li>Une fois installé, lancez WAMP : l'icône dans la barre des tâches doit devenir <strong>verte</strong> (tous les services sont démarrés).</li>
<li>Ouvrez votre navigateur à l'adresse <code>http://localhost/</code> pour vérifier que le serveur fonctionne.</li>
</ol>$q$
  );

  -- Module 2: first HTML/CSS page
  insert into public.modules (title, description, course_id, order_index, duration_minutes)
  values (
    $q$Créer sa première page HTML/CSS$q$,
    $q$Structure d'une page HTML et premiers styles CSS.$q$,
    v_course_id, 1, 20
  )
  returning id into v_module2_id;

  insert into public.lessons (title, module_id, order_index, type, is_published, duration_minutes, content)
  values (
    $q$Structure d'une page HTML$q$,
    v_module2_id, 0, 'text', true, 5,
    $q$<h2>La structure de base</h2>
<p>Dans le dossier <code>C:\wamp64\www</code>, créez un nouveau dossier pour votre projet puis un fichier <code>index.html</code>. Toute page HTML commence par cette structure :</p>
<pre><code>&lt;!DOCTYPE html&gt;
&lt;html&gt;
&lt;head&gt;
  &lt;title&gt;Ma page&lt;/title&gt;
&lt;/head&gt;
&lt;body&gt;

&lt;/body&gt;
&lt;/html&gt;</code></pre>
<p>Le contenu visible de la page se place entre les balises <code>&lt;body&gt;</code>.</p>$q$
  );

  insert into public.lessons (title, module_id, order_index, type, is_published, duration_minutes, content, code_language)
  values (
    $q$Hello World en rouge avec CSS$q$,
    v_module2_id, 1, 'code', true, 10,
    $q$<!DOCTYPE html>
<html>
<head>
  <title>Ma page</title>
  <style>
    h1 {
      color: red;
    }
  </style>
</head>
<body>
  <h1>Hello World</h1>
</body>
</html>$q$,
    'html'
  );

  insert into public.quizzes (title, description, module_id, time_limit_minutes, passing_score)
  values (
    $q$Quiz : WAMP et HTML/CSS$q$,
    $q$Vérifiez vos connaissances sur ce module.$q$,
    v_module2_id, 5, 100
  )
  returning id into v_quiz_id;

  insert into public.questions (quiz_id, question_text, question_type, points, order_index)
  values (
    v_quiz_id,
    $q$Quel est le nom de l'environnement de développement local installé dans ce cours ?$q$,
    'single_choice', 1, 0
  )
  returning id into v_question_id;

  insert into public.answers (question_id, answer_text, is_correct, order_index)
  values
    (v_question_id, 'WAMP', true, 0),
    (v_question_id, 'LAMP', false, 1),
    (v_question_id, 'MAMP', false, 2),
    (v_question_id, 'XAMPP', false, 3);

end $$;
