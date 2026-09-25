# Déploiement du lot 1 (sécurité) en production

Cible : Supabase (projet de production) + Hostinger (site statique Apache).

## Pourquoi migrations et front doivent partir ensemble

| Si l'on déploie seulement… | Conséquence |
|---|---|
| les migrations | Le front actuel insère lui-même les tentatives de quiz, lit les corrigés et affiche les fichiers par URL publique : quiz, PDF, vidéos et avatars cessent de fonctionner |
| le front | Le nouveau front appelle `submit_quiz_attempt`, `get_quiz_for_attempt` et `process_course_completion`, qui n'existent pas encore : les quiz cessent de fonctionner |

Il faut donc appliquer les migrations puis mettre le front en ligne **immédiatement après**.
Prévoir une courte fenêtre (quelques minutes) à faible trafic.

## Migrations concernées

```
20260925120000_sec008_rls_audit.sql
20260925130000_sec002_role_checks.sql
20260925140000_sec004_private_storage.sql
20260925150000_sec006_quiz_rate_limit.sql
20260925160000_sec009_avatar_bucket_limits.sql
20260925170000_sec012_auth_failure_log.sql
```

La migration de base `20260710000000` est déjà marquée comme appliquée en production
(`migration repair`, 2026-09-25) : elle ne sera pas rejouée.

## Procédure

1. **Préparer le build** (poste de travail, branche fusionnée dans `main`) :
   ```bash
   git switch main && git pull
   npm ci
   # .env.local doit contenir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY de production
   npm run build
   ```
   Garder une copie du `dist/` actuellement en ligne (retour arrière).
2. **Sauvegarder la base** :
   ```bash
   npx supabase db dump --linked -f sauvegarde_schema.sql
   npx supabase db dump --linked --data-only -f sauvegarde_donnees.sql
   ```
3. **Vérifier ce qui va être appliqué** : `npx supabase migration list --linked` : les
   6 migrations ci-dessus doivent apparaître « Local » sans « Remote ».
4. **Appliquer les migrations** : `npx supabase db push --linked`.
5. **Mettre le front en ligne** : remplacer le contenu du site sur Hostinger par celui de
   `dist/`, en incluant `.htaccess` et `theme-init.js`.
6. **Contrôles immédiats** :
   - `curl -sI https://elearn.keanu.fr/ | grep -iE "content-security-policy|strict-transport|x-frame"`
     affiche les trois en-têtes (sinon `mod_headers` n'est pas actif sur l'offre) ;
   - catalogue visible sans être connecté ;
   - connexion avec un mauvais mot de passe : message générique ;
   - connexion apprenant : leçon texte, leçon PDF, passage d'un quiz ;
   - photo de profil visible (URL `…/object/sign/avatars/…`) ;
   - console du navigateur : aucune violation CSP.

## Retour arrière

Front et base forment un tout : l'ancien front ne fonctionne pas avec le nouveau schéma
(il insère lui-même les tentatives de quiz, désormais refusées).

- **Problème limité au front** (affichage, CSP trop stricte…) : corriger et redéployer le
  front ; en urgence, retirer la ligne `Content-Security-Policy` du `.htaccess` en ligne.
- **Retour arrière complet** : restaurer la base depuis `sauvegarde_schema.sql` /
  `sauvegarde_donnees.sql` (étape 2), puis remettre le `dist/` sauvegardé à l'étape 1.
