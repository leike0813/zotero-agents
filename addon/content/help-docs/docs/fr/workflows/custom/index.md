# Vue d'ensemble de l'architecture des workflows personnalisés

Le système de workflows de Zotero Agents utilise une **architecture enfichable** — chaque workflow est un répertoire indépendant et autonome nécessitant uniquement un fichier manifeste `workflow.json` et les scripts Hook correspondants. Le Workflow Manager du plugin le découvre et le charge automatiquement.

## Structure des répertoires

Les workflows peuvent être stockés à deux emplacements :

| Emplacement | Type | Description |
|-------------|------|-------------|
| Package de workflows officiel | Officiel | Installé indépendamment via le flux de contenu. Situé dans `<Zotero Data>/zotero-agents/content/official/workflows/` |
| Répertoire de workflows utilisateur | Personnalisé | Configuré dans les préférences ; le Workflow Manager l'analyse automatiquement |

Le **Workflow Manager** du plugin analyse récursivement le répertoire du package officiel et le répertoire des workflows utilisateur, découvre les fichiers `workflow.json` et les enregistre en tant que workflows disponibles.

## Un exemple minimal de workflow

Créer un workflow personnalisé nécessite seulement **2 fichiers** :

```
my-workflow/
├── workflow.json
└── hooks/
    └── applyResult.mjs
```

### workflow.json

```json
{
  "id": "hello-world",
  "label": "Hello World",
  "provider": "pass-through",
  "inputs": {
    "unit": "parent"
  },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

### hooks/applyResult.mjs

```js
export function applyResult({ parent, runtime }) {
  const title = runtime.helpers.resolveItemRef(parent).getField("title");
  runtime.hostApi.notifications.toast({
    text: `Hello, ${title}!`,
    type: "success",
  });
  return { greeted: true };
}
```

Après avoir placé `my-workflow/` dans le répertoire des workflows utilisateur, rouvrez le tableau de bord pour voir le workflow.

## Couches de l'architecture des workflows

Le cycle de vie d'un workflow implique les couches suivantes :

```
Action utilisateur (clic droit / tableau de bord)
    │
    ▼
Workflow Manager — Découvrir, charger, valider
    │
    ├── Entrées — Quelles notices l'utilisateur a-t-il sélectionnées ?
    ├── Paramètres — Quels paramètres l'utilisateur a-t-il définis ?
    ├── Hooks — Prétraitement, construction de requête, gestion des résultats
    └── Exécution — Dispatché vers un backend par le Provider
         │
         ▼
      Provider (SkillRunner / ACP / Generic HTTP / Pass-through)
         │
         ▼
      Backend — Moteur d'exécution distant ou local
```

## Classification des modèles de workflow

Selon la méthode d'exécution et le type de backend, les workflows peuvent être classés comme suit :

| Modèle | Cas d'usage typique | Type de backend |
|--------|---------------------|-----------------|
| **pass-through** | Opérations purement locales (export, traitement de fichiers), aucun backend distant nécessaire | Aucun |
| **skillrunner.job.v1** | Exécution de skill en une seule étape soumise à SkillRunner | skillrunner / acp |
| **skillrunner.sequence.v1** | Exécution de skills enchaînées en plusieurs étapes, avec relay entre les étapes | acp |
| **generic-http.request.v1** | Appel API HTTP unique | generic-http |
| **generic-http.steps.v1** | Appels API HTTP en plusieurs étapes | generic-http |

## Concepts clés de workflow.json

```json
{
  "id": "identifiant unique",
  "label": "nom affiché",
  "provider": "type de backend",
  "inputs": { "unit": "type d'unité d'entrée" },
  "parameters": { /* paramètres configurables */ },
  "execution": { /* contrôle d'exécution */ },
  "request": { "kind": "type de requête" },
  "hooks": { "applyResult": "chemin du script de gestion des résultats" }
}
```

La page suivante explique en détail la signification et l'utilisation de chaque champ.

## Prochaines étapes

- [Rédaction du manifeste de workflow](#doc/workflows%2Fcustom%2Fmanifest) — Explication détaillée de chaque champ de workflow.json
- [Système de hooks](#doc/workflows%2Fcustom%2Fhooks) — Comment écrire les hooks pour chaque étape
- [Système de paramètres](#doc/workflows%2Fcustom%2Fparameters) — Définir des paramètres configurables
