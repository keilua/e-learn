# Modèle de branches

Le dépôt utilise trois branches longues. Aucune poussée directe n'est autorisée sur
`main` : tout passe par une pull request depuis `dev`.

| Branche   | Rôle                                                          | Déploiement            |
|-----------|---------------------------------------------------------------|------------------------|
| `feature` | Développement en cours (fonctionnalités, correctifs, outillage) | Local                  |
| `dev`     | Intégration et recette de la version candidate                 | Local / préproduction  |
| `main`    | Code en production, chaque état est déployable et tagué        | Production (Hostinger) |

## Flux de fusion

```
feature ──PR──> dev ──PR──> main ──> tag vX.Y.Z

hotfix/* (depuis main) ──PR──> main
                          └──> dev ──> feature   (redescente obligatoire)
```

1. Travailler sur `feature` : `git switch feature && git pull`.
   Pour un travail isolé, une branche courte `feature/nom` peut partir de `feature`.
2. Ouvrir une PR `feature` → `dev`. La CI doit être verte et la branche à jour avec `dev`.
3. Pour une livraison : recette sur `dev`, puis PR `dev` → `main`.
4. Après fusion dans `main`, poser un tag de version : `git tag -a vX.Y.Z -m "..." && git push origin vX.Y.Z`.
5. Resynchroniser `feature` avec `dev` après chaque fusion : `git switch feature && git merge dev`.

### Hotfix

1. `git switch main && git pull && git switch -c hotfix/description`.
2. PR `hotfix/*` → `main`, puis tag de version correctif.
3. Redescendre immédiatement le correctif : `main` → `dev` → `feature`,
   pour qu'il ne soit pas écrasé à la livraison suivante.

## Messages de commit

Format [Conventional Commits](https://www.conventionalcommits.org/fr/) :
`type(portée): description` avec `type` parmi `feat`, `fix`, `chore`, `docs`, `test`,
`refactor`, `perf`, `ci`, `build`, `security`.
