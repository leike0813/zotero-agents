# Rédaction du Manifeste de Workflow

`workflow.json` est le fichier manifeste d'un workflow, définissant toutes ses métadonnées et son comportement. Le Workflow Manager découvre et charge les workflows à travers ce fichier.

## Structure de Base

```json
{
  "schemaVersion": 2,
  "id": "my-workflow",
  "label": "My Workflow",
  "version": "1.0.0",
  "provider": "pass-through",
  "display": {
    "core": false,
    "emoji": "🔧"
  },
  "trigger": { "requiresSelection": true },
  "inputs": {
    "member": { "kind": "parent" },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "select": { "policy": "input-member", "source": "selected" },
    "filters": []
  },
  "parameters": {},
  "execution": {},
  "request": { "kind": "pass-through.run.v1" },
  "hooks": {
    "preflight": "hooks/preflight.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

## Référence des Champs

### Identification de Base

| Champ | Requis | Type | Description |
|-------|--------|------|-------------|
| `id` | ✅ | string | Identifiant unique ; ne doit pas être dupliqué. kebab-case recommandé |
| `label` | ✅ | string | Nom d'affichage visible par l'utilisateur |
| `version` | | string | Numéro de version sémantique, par ex. `"1.0.0"` |
| `provider` | ✅ | string | Type de backend. Voir ci-dessous pour les valeurs disponibles |

### Valeurs du Provider

| Valeur | Description |
|--------|-------------|
| `"pass-through"` | Exécution purement locale, aucun backend nécessaire. Adapté aux opérations sur fichiers, exports, etc. |
| `"skillrunner"` | Exécuter des skills via le backend Skill-Runner |
| `"acp"` | Exécuter des skills via le backend ACP |
| `"generic-http"` | Appeler des API via le backend Generic HTTP |

`provider` détermine les types de backends avec lesquels le workflow est compatible, et également les backends affichés comme exécutables dans le Dashboard.

### Contrôle de l'Affichage

```json
{
  "display": {
    "core": true,
    "emoji": "📊"
  },
  "taskNameTemplate": "Processing: {query}",
  "debug_only": false
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `display.core` | boolean | Marquer comme workflow principal (affichage prioritaire dans le Dashboard, avec un badge core) |
| `display.emoji` | string | Icône préfixe du nom d'affichage, par ex. `"📖"` |
| `taskNameTemplate` | string | Modèle de nom de tâche utilisant des marqueurs `{nom du paramètre}`, remplacés par les valeurs réelles au moment de l'exécution |
| `debug_only` | boolean | Lorsque `true`, visible uniquement en mode debug |

### Input Planning Contracts

`inputs` and `validateSelection` have separate, non-interchangeable roles.
`inputs` is the consumer contract for prepared execution members and grouping;
`validateSelection` is the producer contract for raw-selection validation,
candidate selection, ordered filtering, and candidate cardinality.

#### `inputs` — Execution Input Contract

```json
{
  "inputs": {
    "member": {
      "kind": "attachment",
      "accepts": {
        "mime": ["text/markdown", "text/x-markdown", "application/pdf"]
      }
    },
    "grouping": { "mode": "parent" }
  }
}
```

- `member.kind`: `selection`, `parent`, `child`, `attachment`,
  `note`, `generated-note`, or `digest-image-target`.
- `member.accepts.mime` applies only to attachment execution members.
- `grouping.mode: "each"` creates one unit per candidate.
- `grouping.mode: "all"` creates one unit containing all candidates.
- `grouping.mode: "parent"` creates stable parent groups. Candidates without
  parent identity are skipped as `missing-parent`.

#### `validateSelection` — Candidate Production Contract {#selection-validation}

```json
{
  "validateSelection": {
    "require": {
      "selection": {
        "counts": {
          "parents": { "min": 1 },
          "total": { "min": 1 }
        },
        "allowMixed": false
      },
      "candidates": { "min": 1 }
    },
    "select": {
      "policy": "input-member",
      "source": "related"
    },
    "filters": [
      {
        "kind": "source-file-exists",
        "phase": "availability"
      }
    ]
  }
}
```

`require.selection` checks the raw SelectionContext exactly once.
`select` then produces ordered atomic candidates. MIME compatibility and
`filters` run before `require.candidates`. Count rules use either
`{ "exact": n }` or non-negative `min`/`max` values.

Supported selectors are `input-member` (`source: selected|related`),
`selection`, `literature-source`, `generated-note-candidates`, and
`digest-representative-image`. Supported filters are
`source-file-exists`, `candidates-per-parent`,
`generated-note-kinds-absent`, and `artifact-absent`. Parameter-dependent
artifact checks require `phase: "execute"`; availability filters run during
preview and are reapplied during confirmed planning.

#### `trigger` — Empty-selection Gate

```json
{
  "trigger": {
    "requiresSelection": true
  }
}
```

`trigger.requiresSelection` is required in schema v2. It controls only whether
an empty selection may enter planning; it does not replace
`require.selection`.
### Contrôle de l'Exécution

```json
{
  "execution": {
    "timeout_ms": 600000,
    "poll_interval_ms": 2000,
    "mcp": {
      "requiredTools": ["search_items", "get_item_detail"]
    },
    "zoteroHostAccess": {
      "required": false,
      "allowWriteApprovalBypass": false
    },
    "feedback": {
      "showNotifications": true
    }
  }
}
```

| Champ | Description |
|-------|-------------|
| `timeout_ms` | Délai d'attente en millisecondes (effectif uniquement pour les backends Generic HTTP) |
| `poll_interval_ms` | Intervalle de sondage en millisecondes, contrôle la fréquence de vérification de la progression |
| `mcp.requiredTools` | Outils MCP requis par ce workflow (tableau de chaînes de noms d'outils) |
| `zoteroHostAccess.required` | L'accès à l'hôte Zotero est-il requis (pour lire/écrire les données de la bibliothèque) |
| `zoteroHostAccess.allowWriteApprovalBypass` | Le contournement de l'approbation des opérations d'écriture est-il autorisé |
| `feedback.showNotifications` | Afficher les notifications d'exécution. Par défaut `true` ; définir à `false` pour exécuter silencieusement |

> **Le mode d'exécution** (`auto` / `interactive`) a été déplacé vers `request.create.mode` — voir [Types de Requêtes](request-kinds).

### Récupération des Résultats

```json
{
  "result": {
    "fetch": { "type": "bundle" },
    "final_step_id": "finalize",
    "expects": {
      "result_json": "result/result.json",
      "artifacts": [
        "result/artifact1",
        "result/artifact2"
      ]
    }
  }
}
```

| Champ | Description |
|-------|-------------|
| `fetch.type` | Méthode de récupération. `"bundle"` (télécharger un bundle zip), `"result"` (récupérer uniquement le JSON de résultat) |
| `final_step_id` | Pour les workflows séquentiels, spécifie l'id de l'étape finale, utilisé pour déterminer le résultat final |
| `expects.result_json` | Chemin du fichier JSON de résultat attendu (relatif à l'espace de travail d'exécution) |
| `expects.artifacts` | Liste des chemins de fichiers d'artefacts attendus |

### Définition de la Requête

Définition déclarative de la requête, **mutuellement exclusive** avec `hooks.buildRequest` (si les deux existent, `hooks.buildRequest` est prioritaire).

```json
{
  "request": {
    "kind": "skillrunner.job.v1",
    "create": {
      "skill_id": "my-skill",
      "skill_source": "local-package"
    },
    "input": {
      "upload": {
        "files": [
          { "key": "source", "from": "selected.markdown" }
        ]
      }
    },
    "poll": {
      "interval_ms": 2000,
      "timeout_ms": 600000
    }
  }
}
```

Pour des informations détaillées sur chaque `kind`, voir [Types de Requêtes](request-kinds).

### Déclaration des Hooks

```json
{
  "hooks": {
    "preflight": "hooks/preflight.mjs",
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| Champ | Requis | Description |
|-------|--------|-------------|
| `applyResult` | ✅ | **Requis**. Chemin du script pour le traitement des résultats après exécution |
| `preflight` | | Optionnel. S'exécute après la résolution de la sélection et avant la construction de la requête. Il peut continuer, ignorer, court-circuiter vers `applyResult` ou remplacer une unité d'entrée par des unités de requête virtuelles |
| `buildRequest` | | Optionnel. Construire la requête à envoyer au backend. Mutuellement exclusif avec le champ `request` |
| `normalizeSettings` | | Optionnel. Normaliser les paramètres définis par l'utilisateur |

> **Le filtrage des entrées** a été remplacé par le mécanisme déclaratif `validateSelection` — voir [Validation de la Sélection](#selection-validation) ci-dessous.

`preflight` ne participe pas à l'activation du menu, à la classification de sélection debug-probe ni aux vérifications de disponibilité Host Bridge. Conservez les contraintes de sélection dans `validateSelection`, la construction des requêtes fournisseur dans `buildRequest` ou `request`, et les écritures Zotero dans `applyResult`.

Les chemins sont relatifs au répertoire contenant `workflow.json`.

### Localisation

```json
{
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "My Workflow",
        "parameters.language.title": "Language"
      }
    }
  }
}
```

Voir la page [Localisation](localization) pour plus de détails.

### Exemple Complet : un Workflow d'Analyse Littéraire avec Paramètres

```json
{
  "schemaVersion": 2,
  "id": "my-literature-analysis",
  "label": "My Literature Analysis",
  "version": "1.0.0",
  "provider": "skillrunner",
  "display": { "emoji": "📄" },
  "trigger": { "requiresSelection": true },
  "inputs": {
    "member": {
      "kind": "attachment",
      "accepts": { "mime": ["application/pdf"] }
    },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "require": {
      "selection": {
        "counts": { "attachments": { "min": 1 } },
        "allowMixed": false
      }
    },
    "select": { "policy": "input-member", "source": "selected" },
    "filters": [
      { "kind": "source-file-exists", "phase": "availability" }
    ]
  },
  "parameters": {
    "language": {
      "type": "string",
      "title": "Output Language",
      "default": "en-US",
      "enum": ["en-US", "zh-CN", "ja-JP"],
      "allowCustom": true
    }
  },
  "execution": {
    "mode": "auto",
    "skillrunner_mode": "auto",
    "timeout_ms": 600000
  },
  "request": {
    "kind": "skillrunner.job.v1",
    "create": { "skill_id": "literature-analysis" }
  },
  "result": {
    "fetch": { "type": "bundle" },
    "expects": {
      "result_json": "result/result.json"
    }
  },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

## Prochaines Étapes

- [Système de Hooks](hooks) — Apprendre les signatures d'API et les méthodes d'écriture de chaque hook
- [Système de Paramètres](parameters) — Types de paramètres, valeurs enum, sources d'options dynamiques
- [Sélection et Contexte](selection-context) — Comment obtenir les informations sur les éléments sélectionnés par l'utilisateur
