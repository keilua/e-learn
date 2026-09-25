# SEC-010 — Secrets versionnés : constat, purge d'historique et rotation

## Constat (2026-09-25)

| Vérification | Résultat |
|---|---|
| `git log --all --full-history -- '.env*'` | Aucun fichier d'environnement n'a jamais été committé |
| `gitleaks git` sur tout l'historique | 1 fuite : clé Supabase **anon** en dur dans `src/lib/customSupabaseClient.js`, commit `94d42c5` |
| Recherche de JWT dans `git log --all -p` | Un seul jeton, de rôle `anon`. Aucune clé `service_role` n'a jamais été committée |

La clé `anon` est destinée au navigateur (elle figure de toute façon dans le JavaScript servi
aux visiteurs) : sa fuite n'ouvre aucun accès que la RLS n'autorise pas déjà. Elle est
néanmoins retirée du code et de l'historique par hygiène, et parce qu'un outil de détection
doit pouvoir tourner sans exception.

## Correctifs appliqués dans le code

- `src/lib/customSupabaseClient.js` lit `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
  depuis l'environnement et échoue explicitement s'ils manquent.
- `.env.example` liste les variables attendues, sans valeur ; `.gitignore` ignore `.env` et
  `.env.*` sauf `.env.example`.
- Test `src/test/security/secrets.test.js` : échoue si un JWT ou une URL de projet Supabase
  réapparaît dans `src/`.
- CI `.github/workflows/qualite.yml` : job gitleaks sur tout l'historique à chaque push et PR.
- `.gitleaksignore` : exception temporaire pour la seule empreinte connue, à supprimer
  après la purge.

## Procédure de purge d'historique (à exécuter manuellement)

> Réécrire l'historique change tous les identifiants de commit. Prévenir les
> collaborateurs : chacun devra recloner le dépôt après l'opération.

1. **Sauvegarder** le dépôt complet :
   ```bash
   git clone --mirror https://github.com/keilua/e-learn.git e-learn-sauvegarde.git
   ```
2. **Installer** git-filter-repo : `pip install git-filter-repo`.
3. **Travailler sur un clone miroir neuf** :
   ```bash
   git clone --mirror https://github.com/keilua/e-learn.git e-learn-purge.git
   cd e-learn-purge.git
   ```
4. **Remplacer la clé** partout dans l'historique. Créer `remplacements.txt` (hors dépôt)
   contenant une ligne par secret :
   ```
   <VALEUR_EXACTE_DE_LA_CLE_ANON>==>***SUPPRIME***
   ```
   puis :
   ```bash
   git filter-repo --replace-text ../remplacements.txt
   ```
5. **Vérifier** : `git log --all -p | grep -c "eyJ"` doit renvoyer 0, et
   `gitleaks git . --no-banner` ne doit plus rien trouver.
6. **Pousser** l'historique réécrit (désactiver temporairement la protection des branches) :
   ```bash
   git remote add origin https://github.com/keilua/e-learn.git   # filter-repo retire le remote
   git push --force --mirror origin
   ```
7. **Recloner** le dépôt de travail, recopier `.env.local`, supprimer `.gitleaksignore`.
8. Demander au support GitHub la purge des vues en cache des anciens commits si besoin
   (les PR fermées conservent des références aux anciens commits).

## Procédure de rotation des clés Supabase

Supabase propose deux familles de clés ; la rotation recommandée est la migration vers les
nouvelles clés API, qui ne déconnecte pas les utilisateurs.

1. Dashboard Supabase → **Project Settings → API Keys**.
2. Créer une **publishable key** (`sb_publishable_…`) : elle remplace la clé `anon`.
3. Remplacer `VITE_SUPABASE_ANON_KEY` par cette nouvelle valeur dans `.env.local` (et dans
   les variables du serveur de build), rebuilder et redéployer le site.
4. Vérifier le bon fonctionnement en production (connexion, catalogue, leçon, quiz).
5. **Désactiver les clés legacy** (`anon` et `service_role` JWT) dans le même écran : l'ancienne
   clé exposée devient inutilisable.
6. Si des secrets serveur utilisent `service_role` (Edge Functions, scripts), créer une
   **secret key** (`sb_secret_…`) et les mettre à jour avant l'étape 5.

Alternative (plus brutale) : *JWT Settings → Generate new secret*. Cela invalide toutes les
sessions actives et les deux clés legacy en même temps ; à réserver au cas où une clé
`service_role` aurait fui.
