# SEC-007 — Dépendances vulnérables

| Mesure | Avant (2026-09-25) | Après |
|---|---|---|
| `npm audit` total | 19 (1 low, 10 moderate, 8 high, 0 critical) | 4 (4 moderate) |
| high + critical | 8 | **0** |

## Actions

- `npm audit fix` (sans `--force`) : mises à jour compatibles de `pdfjs-dist`, `postcss`,
  `undici`, `nanoid`, `js-yaml`, `browserslist`, `brace-expansion`…
- `vite` 4.5 → **7.3** et `@vitejs/plugin-react` 4.3 → **5.2** : les failles high de Vite
  (contournement de `server.fs.deny`, traversée de répertoire, injection via
  `launch-editor`) touchent le serveur de développement. Build et serveur de dev vérifiés.
- CI : `npm audit --audit-level=high` bloque toute nouvelle vulnérabilité high/critical.

## Vulnérabilités modérées restantes (acceptées, suivies)

| Paquet | Avis | Pourquoi pas corrigé maintenant | Atténuation |
|---|---|---|---|
| `quill` ≤ 1.3.7 / `react-quill` | GHSA-4943-9vgg-gr5r (XSS dans l'éditeur) | Aucune version corrigée de `react-quill` ; le remplacement (`react-quill-new`, Quill 2) change le format HTML produit | Tout HTML de l'éditeur est assaini à l'enregistrement et à l'affichage (SEC-003) ; CSP (SEC-001) |
| `react-router` / `react-router-dom` 6.x | GHSA-wrjc-x8rr-h8h6 (redirection ouverte via `\` dans `<Link>`/`useNavigate`), GHSA-337j-9hxr-rhxg (hydratation SSR) | Correctif uniquement en v7 (changement majeur) ; le routeur sera remplacé par l'App Router Next.js au lot 2 | Aucune navigation n'utilise une URL fournie par l'utilisateur ; pas de SSR React Router |
