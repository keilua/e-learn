# Modèle de branches

Le dépôt utilise trois branches longues. Aucune poussée directe n'est autorisée sur
`preprod` et `prod` : tout passe par une pull request avec CI verte.

| Branche   | Rôle                                                        | Déploiement                  |
|-----------|-------------------------------------------------------------|------------------------------|
| `dev`     | Intégration continue des fonctionnalités terminées          | Local / environnement de dev |
| `preprod` | Recette : version candidate, validée avant mise en production | Environnement de préproduction |
| `prod`    | Code en production, chaque état est déployable et tagué     | Production (Hostinger)       |

## Branches de travail

| Préfixe      | Part de | Fusionne dans              | Usage                          |
|--------------|---------|----------------------------|--------------------------------|
| `feature/*`  | `dev`   | `dev`                      | Nouvelle fonctionnalité        |
| `fix/*`      | `dev`   | `dev`                      | Correctif non urgent           |
| `chore/*`    | `dev`   | `dev`                      | Outillage, configuration, docs |
| `hotfix/*`   | `prod`  | `prod`, puis `preprod` et `dev` | Correctif urgent en production |

## Flux de fusion

```
feature/* ──┐
fix/*     ──┼──> dev ──PR──> preprod ──PR──> prod ──> tag vX.Y.Z
chore/*   ──┘

hotfix/* (depuis prod) ──PR──> prod
                          └──> preprod ──> dev   (redescente obligatoire)
```

1. Créer la branche de travail depuis `dev` : `git switch dev && git pull && git switch -c feature/ma-fonctionnalite`.
2. Ouvrir une PR vers `dev`. La CI doit être verte et la branche à jour avec `dev`.
3. Pour une livraison : PR `dev` → `preprod`, recette, puis PR `preprod` → `prod`.
4. Après fusion dans `prod`, poser un tag de version : `git tag -a vX.Y.Z -m "..." && git push origin vX.Y.Z`.

### Hotfix

1. `git switch prod && git pull && git switch -c hotfix/description`.
2. PR `hotfix/*` → `prod`, puis tag de version correctif.
3. Redescendre immédiatement le correctif : PR `prod` → `preprod`, puis `preprod` → `dev`,
   pour qu'il ne soit pas écrasé à la livraison suivante.

## Messages de commit

Format [Conventional Commits](https://www.conventionalcommits.org/fr/) :
`type(portée): description` avec `type` parmi `feat`, `fix`, `chore`, `docs`, `test`,
`refactor`, `perf`, `ci`, `build`, `security`.
