# Lot 1 — Sécurité : récapitulatif

Branche `feature`, 2026-09-25. Tous les tests ci-dessous ont été **exécutés** : 81 tests
Vitest et 59 assertions pgTAP, sur une base reconstruite depuis zéro (13 migrations).
Parcours vérifiés dans Chrome headless, sur la stack Supabase locale, avec les en-têtes
de `public/.htaccess`.

## Tickets

| Réf. | Criticité | Statut | Commit | Fichiers principaux | Test associé |
|---|---|---|---|---|---|
| SEC-010 | Critique | Corrigé ; purge d'historique **à faire manuellement** | `9fb8160` | `src/lib/customSupabaseClient.js`, `.github/workflows/qualite.yml`, `.gitleaksignore`, `docs/securite/SEC-010-purge-rotation.md` | `src/test/security/secrets.test.js` (3) ; gitleaks en CI |
| SEC-008 | Élevé | Corrigé | `18b6569`, `e450c40` | `supabase/migrations/20260925120000_sec008_rls_audit.sql`, `src/services/quizService.js`, `src/pages/quizzes/QuizPage.jsx`, `src/services/completionService.js` | `supabase/tests/sec008_rls.test.sql` (26), `src/services/quizService.test.js` (3) |
| SEC-003 | Élevé | Corrigé | `0a211c4` | `src/lib/sanitize.js`, `LessonViewer.jsx`, `CreateLesson.jsx`, `EditLesson.jsx`, `RichTextEditor.jsx` | `src/lib/sanitize.test.jsx` (17 dont 6 charges XSS de référence) |
| SEC-007 | Élevé | Corrigé (0 high/critical) | `c12ad1c`, `313cd5d` | `package.json`, `package-lock.json`, `docs/securite/SEC-007-dependances.md` | `npm audit --audit-level=high` en CI |
| SEC-001 | Moyen | Corrigé | `7a6ff98` | `public/.htaccess`, `public/theme-init.js`, `index.html`, `vite.config.js` | `src/test/security/headers.test.js` (12) |
| SEC-011 | Moyen | Corrigé (avec SEC-001) | `7a6ff98` | `public/.htaccess` | `src/test/security/headers.test.js` |
| SEC-002 | Moyen | Corrigé côté base ; middleware prévu au lot 2 | `55a8c86`, `e450c40` | `supabase/migrations/20260925130000_sec002_role_checks.sql`, `docs/securite/SEC-002-controle-roles.md` | `supabase/tests/sec002_roles.test.sql` (8) |
| SEC-004 | Moyen | Corrigé | `20d4bbe` | `supabase/migrations/20260925140000_sec004_private_storage.sql`, `src/lib/storage.js`, `src/components/ui/avatar.jsx`, `src/components/StoredImage.jsx`, `LessonViewer.jsx` | `supabase/tests/sec004_storage.test.sql` (9), `src/lib/storage.test.js` (8) |
| SEC-005 | Moyen | Corrigé | `1de5487` | `src/lib/authErrors.js`, `src/contexts/AuthContext.jsx` | `src/lib/authErrors.test.jsx` (9) |
| SEC-006 | Moyen | Corrigé | `a42c80f` | `supabase/migrations/20260925150000_sec006_quiz_rate_limit.sql` | `supabase/tests/sec006_quiz_rate_limit.test.sql` (5) |
| SEC-009 | Moyen | Corrigé | `ec62257` | `src/lib/fileValidation.js`, `EditProfile.jsx`, `FileUploadService.js`, `supabase/migrations/20260925160000_sec009_avatar_bucket_limits.sql` | `src/lib/fileValidation.test.js` (12), `supabase/tests/sec009_avatar_bucket.test.sql` (2) |
| SEC-012 | Moyen | Corrigé | `eca0ddc` | `supabase/migrations/20260925170000_sec012_auth_failure_log.sql`, `src/contexts/AuthContext.jsx` | `supabase/tests/sec012_auth_failures.test.sql` (9), `src/contexts/AuthContext.test.jsx` (4) |

« Échoue avant / passe après » : vérifié pour chaque ticket, sauf dans ces cas.
- **SEC-003** : l'affichage du texte était déjà protégé par le DOMPurify par défaut ; seul le
  test de l'iframe vidéo (URL `javascript:`) échouait sur l'ancien code.
- **SEC-002** : 7 des 8 règles étaient déjà appliquées ; seule la création de cours par un
  apprenant passait.
- **SEC-007** : pas de test unitaire, le contrôle est `npm audit` en CI.

## Correctifs trouvés en cours de route

| Commit | Problème | Impact avant correction |
|---|---|---|
| `18b6569` | Aucune lecture des inscriptions/progression autorisée aux formateurs | Pages « inscrits » et « statistiques » vides |
| `e450c40` | Régression introduite puis corrigée avant tout déploiement : politiques admin évaluées pour `anon` | Catalogue public en erreur pour les visiteurs |
| `313cd5d` | Versions différentes de pdf.js (API 5.4.296, worker 5.6.205) | Visionneuse PDF des leçons en échec |
| `5b6fdb7` | Quiz sans limite de temps soumis à vide dès l'ouverture | Note de 0 enregistrée d'office |
| `aae45a2` | 18 composants shadcn important des paquets absents | `npm run lint` en échec |

## Risques résiduels documentés

- `users.email` lisible par tout utilisateur connecté (voir SEC-008).
- `quill` / `react-quill` et `react-router` 6 : 4 vulnérabilités **modérées** sans correctif
  compatible (voir SEC-007).
- L'assainissement à l'enregistrement se fait dans le navigateur ; un appel API direct reste
  neutralisé à l'affichage et par la CSP. Un assainissement serveur arrivera avec les
  Server Actions (lot 2).
- L'interface admin fait partie du bundle livré à tous ; les données restent protégées par la
  RLS. La fermeture complète passe par le middleware du lot 2.
- La clé `anon` reste dans l'historique Git tant que la purge (SEC-010) n'a pas été faite.

## Déploiement

Voir `docs/securite/DEPLOIEMENT-LOT1.md` : les migrations et le nouveau front doivent être
mis en ligne ensemble.
