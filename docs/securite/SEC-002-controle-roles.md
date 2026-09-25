# SEC-002 — Contrôle des rôles : client et serveur

Date : 2026-09-25. Migration : `20260925130000_sec002_role_checks.sql`.
Tests : `supabase/tests/sec002_roles.test.sql` (8 assertions pgTAP).

## Rôles

Énumération `public.user_role` : `student`, `instructor`, `admin`. Le rôle est stocké dans
`public.users.role`. Il vaut `student` à l'inscription (trigger `handle_new_user`, qui ignore
tout rôle transmis dans les métadonnées d'inscription).

## Ce qui existe côté client (confort d'interface, pas une sécurité)

| Élément | Fichier | Effet |
|---|---|---|
| `ProtectedRoute` | `src/components/auth/ProtectedRoute.jsx` | Redirige vers `/login` sans session |
| `RequireRole` | `src/components/auth/RequireRole.jsx` | Redirige vers `/dashboard` si le rôle n'est pas dans la liste (routes formateur et `/admin/*`) |
| `useAuth().role` | `src/contexts/AuthContext.jsx` | Rôle lu dans `public.users` et utilisé pour l'affichage |

Ces gardes s'exécutent dans le navigateur : on peut les contourner en appelant l'API Supabase
directement. De plus, le code des pages admin fait partie du bundle JavaScript servi à tous
les visiteurs (application monopage).

## Ce que la base applique réellement (vérifié par tests)

| Règle | Mécanisme | Test |
|---|---|---|
| Un utilisateur ne peut pas changer son propre rôle | Trigger `trg_prevent_role_self_escalation` : seul un admin peut modifier `role` | sec002 #1 |
| Modifier ou supprimer le profil d'un autre : admin seulement | Politiques `Admins can update any profile` / `Admins can delete profiles` (`is_admin`) | sec002 #2, #3, #7 |
| Créer un cours : formateur ou admin | **Ajouté** : `has_role(['instructor','admin'])` dans la politique d'insertion de `courses` (un apprenant pouvait créer un cours via l'API) | sec002 #4, #6 |
| Contenu d'un cours (modules, leçons, quiz, questions, réponses, blocs, badges) | Politiques par jointure jusqu'à `courses.instructor_id = auth.uid()` | sec008 |
| Lectures globales (toutes les inscriptions, tentatives, certificats) | Politiques `Admins can view …` (`is_admin`) | sec002 #5, sec008 |
| Fonctions de contrôle non exposées aux anonymes | `revoke execute … from anon` | sec002 #8 |

Conséquence : un apprenant qui force l'accès à `/admin` voit l'interface (le code est dans le
bundle), mais toutes les lectures et écritures privilégiées lui sont refusées par la base.

## Écart restant et préparation du lot 2 (middleware serveur)

L'écart restant est l'**exposition de l'interface** : le HTML et le JS des pages admin et
formateur sont livrés à tous. Le lot 2 (Next.js App Router) le ferme ainsi :

1. **Rôle dans le jeton.** Ajouter un *Custom Access Token Hook* Supabase
   (`auth.custom_access_token_hook`) qui copie `public.users.role` dans une claim
   `user_role` du JWT. Le middleware lit le rôle sans requête en base à chaque navigation.
   La base continue de s'appuyer sur `public.users.role` (via `is_admin` / `has_role`) :
   la claim sert au routage, jamais à l'autorisation des données.
2. **`middleware.ts`** (client `@supabase/ssr` middleware) : rafraîchit la session, puis
   - `/tableau-de-bord`, `/cours/*/lecon/*`, `/quiz/*` sans session → redirection `/connexion` ;
   - `/admin/*` sans `user_role = admin` → redirection **avant** tout rendu (aucun HTML admin
     produit) ;
   - routes formateur sans `user_role ∈ {instructor, admin}` → redirection.
3. **Double contrôle dans les layouts serveur** (`app/admin/layout.tsx`) : `getUser()` +
   lecture du rôle en base avant le rendu, au cas où le middleware serait contourné par une
   mauvaise configuration de `matcher`.
4. **Server Actions** : chaque action vérifie à nouveau l'utilisateur et son rôle ; la RLS
   reste le dernier rempart.
5. **Test E2E-08** (lot 4) : accès direct à `/admin` en tant qu'apprenant → redirection et
   absence de contenu admin dans le HTML source.
