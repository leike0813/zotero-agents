# Rédaction du manifeste de Workflow

`workflow.json` est le fichier manifeste d'un workflow, définissant toutes ses métadonnées et son comportement. Le Workflow Manager découvre et charge les workflows à travers ce fichier.

## Structure de base

```json
{
  "id": "my-workflow",
  "label": "My Workflow",
  "version": "1.0.0",
  "provider": "pass-through",
  "display": {
    "core": false,
    "emoji": "🔧"
  },
  "inputs": { "unit": "parent" },
  "parameters": {},
  "execution": {},
  "request": { "kind": "pass-through.run.v1" },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

## Référence des champs

### Identification de base

| Champ | Requis | Type | Description |
|-------|--------|------|-------------|
| `id` | ✅ | string | Identifiant unique ; ne doit pas être dupliqué. kebab-case recommandé |
| `label` | ✅ | string | Nom d'affichage visible par l'utilisateur |
| `version` | | string | Numéro de version sémantique, par ex. `"1.0.0"` |
| `provider` | ✅ | string | Type de backend. Voir ci-dessous pour les valeurs disponibles |

### Valeurs du provider

| Valeur | Description |
|--------|-------------|
| `"pass-through"` | Exécution purement locale, aucun backend nécessaire. Adapté aux opérations sur fichiers, exports, etc. |
| `"skillrunner"` | Exécuter des skills via le backend Skill-Runner |
| `"acp"` | Exécuter des skills via le backend ACP |
| `"generic-http"` | Appeler des API via le backend Generic HTTP |

`provider` détermine les types de backends avec lesquels le workflow est compatible, et également les backends affichés comme exécutables dans le Dashboard.

### Contrôle de l'affichage

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

### Définition des entrées

```json
{
  "inputs": {
    "unit": "attachment",
    "accepts": {
      "mime": ["text/markdown", "text/x-markdown", "application/pdf"]
    },
    "per_parent": {
      "min": 1,
      "max": 1
    }
  }
}
```

| Champ | Description |
|-------|-------------|
| `unit` | **Type d'unité d'entrée**. `"attachment"` (pièce jointe), `"parent"` (notice parente), `"note"` (note), `"workflow"` (aucune sélection d'élément nécessaire, déclenché directement depuis le Dashboard) |
| `accepts.mime` | Types MIME acceptés (uniquement applicable quand `unit: "attachment"`). Si non spécifié, tous les types sont acceptés |
| `per_parent.min` | Nombre minimum de pièces jointes par notice parente |
| `per_parent.max` | Nombre maximum de pièces jointes par notice parente |

Lorsque `unit: "workflow"`, aucune sélection d'éléments par l'utilisateur n'est requise pour le déclenchement (par ex. « Créer une synthèse de sujet »).

### validateSelection — Validation de la sélection {#selection-validation}

`validateSelection` est une validation déclarative de la sélection. Il couvre les cas courants comme « ignorer les éléments qui ont déjà des résultats » ou « n'accepter que les sélections de types spécifiques » — sans écrire de JavaScript.

```json
{
  "validateSelection": {
    "select": {
      "policy": "literature-source"
    },
    "require": {
      "counts": {
        "parents": 1
      },
      "allowMixed": false
    },
    "exclude": [
      {
        "kind": "generated-notes-all",
        "noteKinds": ["digest", "references", "citation-analysis"]
      }
    ]
  }
}
```

### `select` — Politique de sélection

| Champ | Type | Description |
|-------|------|-------------|
| `select.policy` | string | Politique de sélection. Valeurs prises en charge ci-dessous |
| `select.unit` | string | Remplacer l'unité d'entrée pour la validation de la sélection. `"attachment"` / `"parent"` / `"note"` / `"workflow"` |

**Valeurs prises en charge pour `select.policy` :**

| Politique | Description |
|-----------|-------------|
| `input-unit` | Accepter les éléments correspondant à l'unité d'entrée |
| `literature-source` | Accepter les sources littéraires (pièces jointes ou notices parentes avec des pièces jointes développables) |
| `pdf-attachment` | Accepter uniquement les pièces jointes PDF |
| `selected-parent` | Accepter les notices parentes de la sélection |
| `generated-note-candidates` | Accepter les éléments candidats pour les notes générées |
| `digest-representative-image` | Éléments cibles pour l'extraction d'image représentative |

### `require` — Exigences de sélection

| Champ | Type | Description |
|-------|------|-------------|
| `require.counts.parents` | number | Nombre minimum requis de notices parentes |
| `require.counts.attachments` | number | Nombre minimum requis de pièces jointes |
| `require.counts.notes` | number | Nombre minimum requis de notes |
| `require.counts.children` | number | Nombre minimum requis d'éléments enfants |
| `require.counts.total` | number | Nombre total minimum requis d'éléments |
| `require.allowMixed` | boolean | Le mélange de différents types d'éléments dans la sélection est-il autorisé |

### `exclude` — Règles d'exclusion

| Champ | Type | Description |
|-------|------|-------------|
| `exclude[]` | array | Liste de règles d'exclusion. Si une règle correspond, l'élément courant est ignoré |

**Valeurs prises en charge pour `exclude.kind` :**

| kind | Description | Paramètres supplémentaires |
|------|-------------|---------------------------|
| `generated-notes-all` | L'élément possède déjà des notes générées du type spécifié | `noteKinds` : liste des types de notes, par ex. `["digest", "references", "citation-analysis"]` |
| `artifact-exists` | L'élément possède déjà l'artefact spécifié (pour éviter l'exécution redondante) | `target` : `"deep-reading-html"` / `"translator-markdown"` / `"mineru-markdown"` ; `parameter` : paramètre de langue optionnel pour la correspondance des artefacts |

### `derive` — Sélections dérivées

| Champ | Type | Description |
|-------|------|-------------|
| `derive[]` | array | Opérations de sélection dérivée. `"exportCandidates"` — dériver les candidats pour l'export de notes ; `"digestRepresentativeImageTarget"` — dériver les cibles d'image représentative depuis les notes digest |

**Exemple :**

```json
{
  "validateSelection": {
    "select": { "policy": "literature-source" },
    "exclude": [
      { "kind": "artifact-exists", "target": "deep-reading-html" }
    ]
  }
}
```

> Dans cet exemple, les éléments qui possèdent déjà l'artefact HTML de lecture approfondie sont automatiquement ignorés, sans nécessiter de filtrage manuel par l'utilisateur.

### Contrôle du déclenchement

```json
{
  "trigger": {
    "requiresSelection": false
  }
}
```

| Champ | Description |
|-------|-------------|
| `requiresSelection` | La sélection d'éléments par l'utilisateur est-elle requise pour le déclenchement. Par défaut `true`. Lorsque `false`, le workflow peut être exécuté depuis le Dashboard sans sélectionner d'éléments. Généralement défini à `false` quand `inputs.unit: "workflow"` |

### Contrôle de l'exécution

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

> **Mode d'exécution** (`auto` / `interactive`) a été déplacé vers `request.create.mode` — voir [Types de requêtes](#doc/workflows%2Fcustom%2Frequest-kinds).

### Récupération des résultats

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
| `final_step_id` | Pour les workflows séquentiels, spécifie l'identifiant de l'étape finale, utilisé pour déterminer le résultat final |
| `expects.result_json` | Chemin du fichier JSON de résultat attendu (relatif à l'espace de travail d'exécution) |
| `expects.artifacts` | Liste des chemins de fichiers d'artefacts attendus |

### Définition de la requête

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

Pour des informations détaillées sur chaque `kind`, voir [Types de requêtes](#doc/workflows%2Fcustom%2Frequest-kinds).

### Déclaration des hooks

```json
{
  "hooks": {
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| Champ | Requis | Description |
|-------|--------|-------------|
| `applyResult` | ✅ | **Requis**. Chemin du script pour le traitement des résultats après exécution |
| `buildRequest` | | Optionnel. Construire la requête à envoyer au backend. Mutuellement exclusif avec le champ `request` |
| `normalizeSettings` | | Optionnel. Normaliser les paramètres définis par l'utilisateur |

> **Le filtrage des entrées** a été remplacé par le mécanisme déclaratif `validateSelection` — voir [Validation de la sélection](#selection-validation) ci-dessous.

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

Voir la page [Localisation](#doc/workflows%2Fcustom%2Flocalization) pour plus de détails.

### Exemple complet : un workflow d'analyse littéraire avec paramètres

```json
{
  "id": "my-literature-analysis",
  "label": "My Literature Analysis",
  "version": "1.0.0",
  "provider": "skillrunner",
  "display": { "emoji": "📄" },
  "inputs": {
    "unit": "attachment",
    "accepts": { "mime": ["application/pdf"] },
    "per_parent": { "min": 1, "max": 1 }
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

## Prochaines étapes

- [Système de hooks](#doc/workflows%2Fcustom%2Fhooks) — Apprendre les signatures d'API et les méthodes d'écriture de chaque hook
- [Système de paramètres](#doc/workflows%2Fcustom%2Fparameters) — Types de paramètres, valeurs enum, sources d'options dynamiques
- [Sélection et contexte](#doc/workflows%2Fcustom%2Fselection-context) — Comment obtenir les informations sur les éléments sélectionnés par l'utilisateur
