# SEC-008 — Audit des politiques RLS

Date : 2026-09-25. Migration : `supabase/migrations/20260925120000_sec008_rls_audit.sql`.
Tests : `supabase/tests/sec008_rls.test.sql` (24 assertions pgTAP, `npx supabase test db`).

## Failles corrigées

| # | Table / fonction | Avant | Après |
|---|---|---|---|
| 1 | `answers` | `SELECT` ouvert à tout visiteur d'un cours publié : `is_correct` et les réponses attendues des questions courtes étaient lisibles | Lecture réservée au formateur propriétaire et aux admins ; l'apprenant reçoit les choix via `get_quiz_for_attempt()`, sans corrigé |
| 2 | `quiz_attempts` | L'apprenant calculait son score dans le navigateur et insérait lui-même la tentative | Insertion interdite aux clients ; notation par `submit_quiz_attempt()` côté serveur |
| 3 | `user_badges` | `INSERT` par l'utilisateur : auto-attribution de n'importe quel badge | Attribution uniquement par le serveur |
| 4 | `certificates` | `INSERT` par l'utilisateur : auto-émission de certificat | Émission uniquement par `process_course_completion()` / `submit_quiz_attempt()` |
| 5 | `course_enrollments` | `UPDATE` par l'utilisateur : passage de son inscription à « terminé », progression à 100 % | Création seulement à l'état `active` / 0 % ; progression et état calculés par le serveur |
| 6 | `lesson_progress` | Politique `ALL` : validation possible de leçons de cours non suivis | Insertion/mise à jour limitées aux leçons accessibles (RLS de `lessons` réappliquée) |
| 7 | `notifications` | Tout utilisateur connecté pouvait créer une notification au nom de n'importe qui | `sender_id` doit être l'utilisateur connecté |
| 8 | `course_enrollments`, `lesson_progress` | Aucune politique de lecture pour le formateur : ses pages « inscrits » et « statistiques » recevaient des listes vides | Lecture autorisée au formateur propriétaire du cours |

## Blocs de contenu

Nouvelle table `content_blocks` (leçon découpée en blocs ordonnés). Lecture : mêmes droits
que la leçon. Écriture : jointure `content_blocks → lessons → modules → courses` avec
`courses.instructor_id = auth.uid()`. Pendant la transition, le bloc d'ordre 0 est
synchronisé par trigger avec `lessons.content`, que l'interface actuelle continue d'utiliser.

## Matrice après correction

Chaque table publique a désormais une politique explicite pour chaque opération (vérifié par
le premier test pgTAP). `⛔` = politique restrictive d'interdiction : l'opération n'est
possible que via une fonction serveur `SECURITY DEFINER`.

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| answers | Admins can view answers<br>Instructors can manage answers | Instructors can manage answers | Instructors can manage answers | Instructors can manage answers |
| badges | Anyone can view badges | Instructors can create badges | Instructors can update own badges | Instructors can delete own badges |
| certificates | Users can view own certificates<br>Admins can view all certificates | ⛔ Interdit : émission directe de certificat | ⛔ Interdit : modification de certificat | Admins can delete certificates |
| content_blocks | Users can view blocks of accessible lessons | Instructors can insert blocks in own courses | Instructors can update blocks in own courses | Instructors can delete blocks in own courses |
| course_enrollments | Admins can view all enrollments<br>Instructors can view enrollments of their courses<br>Users can view own enrollments | Users can enroll in courses | ⛔ Interdit : modification directe d'inscription | Admins can delete enrollments |
| courses | Anyone can view published courses<br>Admins can view all courses | Instructors can create courses | Instructors can update own courses | Instructors can delete own courses |
| discussion_replies | Anyone can view replies | Users can create replies | Users can update own replies | Users can delete own replies |
| discussions | Anyone can view discussions | Users can create discussions | Instructors can resolve discussions<br>Users can update own discussions | Users can delete own discussions |
| donations | Recipients can view donations received<br>Donors can view their own donations | Authenticated users can create their own donation | ⛔ Interdit : modification de don | ⛔ Interdit : suppression de don |
| lesson_progress | Users can view own lesson progress<br>Instructors can view progress in their courses | Users can track progress on accessible lessons | Users can update own lesson progress | Users can delete own lesson progress |
| lessons | Instructors can view own course lessons<br>Enrolled students can view published lessons | Instructors can insert lessons | Instructors can update lessons | Instructors can delete lessons |
| modules | Instructors can manage own course modules<br>Instructors can view own modules<br>Users can view modules of accessible courses | Instructors can manage own course modules | Instructors can manage own course modules | Instructors can manage own course modules |
| notification_preferences | Users can view own notification preferences | Users can insert own notification preferences | Users can update own notification preferences | Users can delete own notification preferences |
| notifications | Users can view own notifications | Users can send notifications as themselves | Users can update own notifications | Users can delete own notifications |
| questions | Anyone can view questions<br>Instructors can manage questions | Instructors can manage questions | Instructors can manage questions | Instructors can manage questions |
| quiz_attempts | Admins can view all attempts<br>Instructors can view attempts for their courses<br>Users can view own attempts | ⛔ Interdit : insertion directe de tentative | ⛔ Interdit : modification de tentative | ⛔ Interdit : suppression de tentative |
| quizzes | Instructors can view own course quizzes<br>Students can view quizzes | Instructors can create quizzes | Instructors can update own course quizzes | Instructors can delete own course quizzes |
| roles | Anyone can view roles | ⛔ Interdit : création de rôle | ⛔ Interdit : modification de rôle | ⛔ Interdit : suppression de rôle |
| search_history | Users can view own search history | Users can insert own search history | ⛔ Interdit : modification de l'historique de recherche | Users can delete own search history |
| user_badges | Admins can view all earned badges<br>Users can view their own earned badges | ⛔ Interdit : attribution directe de badge | ⛔ Interdit : modification de badge obtenu | ⛔ Interdit : suppression de badge obtenu |
| users | Users can view all profiles | ⛔ Interdit : création directe de profil | Admins can update any profile<br>Users can update own profile | Admins can delete profiles |

## Fonctions serveur ajoutées

| Fonction | Appelable par | Rôle |
|---|---|---|
| `get_quiz_for_attempt(quiz)` | authenticated | Questions et choix d'un quiz accessible, sans corrigé |
| `submit_quiz_attempt(quiz, réponses)` | authenticated | Notation serveur, enregistrement de la tentative, badge de quiz, complétion du cours |
| `process_course_completion(cours)` | authenticated | Progression en une requête d'agrégation, certificat et badge de cours |
| `complete_course_for_user(user, cours)` | aucun client | Logique interne partagée |
| `can_access_course(cours)`, `is_badge_owner(quiz, cours)` | authenticated | Prédicats utilisés par les fonctions et politiques |
| `sync_lesson_content_block()` | aucun client | Trigger de synchronisation `lessons.content → content_blocks` |

## Risques résiduels (non corrigés dans ce lot)

- **`users.email` lisible par tout utilisateur connecté** (`Users can view all profiles`,
  `SELECT true`). Les pages formateur et admin affichent l'email des inscrits : le restreindre
  par colonne casserait ces écrans. À traiter au lot 2 (rendu serveur, requêtes filtrées par rôle)
  ou par une vue dédiée.
- **Dons simulés** : `donations` accepte un montant et un statut fournis par le client. Il n'y
  a pas de paiement réel (Stripe n'est pas branché) ; à revoir si le paiement devient réel.
- **Règle de complétion unifiée** : auparavant, réussir tous les quiz suffisait à obtenir le
  certificat depuis la page quiz, alors que la page leçon exigeait aussi toutes les leçons.
  Le serveur applique désormais la règle complète (leçons publiées + quiz réussis).
