# Système de paramètres

Les workflows peuvent définir des paramètres configurables qui ouvrent une boîte de dialogue de paramètres que l'utilisateur remplit avant l'exécution. Le système de paramètres prend en charge plusieurs types et sources de données dynamiques.

## Définition des paramètres

Les paramètres sont définis dans le champ `parameters` de `workflow.json` :

```json
{
  "parameters": {
    "language": {
      "type": "string",
      "title": "Output Language",
      "description": "Select the language for output content",
      "default": "en-US",
      "enum": ["en-US", "zh-CN", "ja-JP"],
      "allowCustom": true
    },
    "maxResults": {
      "type": "number",
      "title": "Maximum Results",
      "description": "Upper limit on the number of results returned",
      "default": 10,
      "min": 1,
      "max": 100
    },
    "enableFilter": {
      "type": "boolean",
      "title": "Enable Filtering",
      "description": "Whether to enable result filtering",
      "default": true,
      "visible_if": { "parameter": "language", "equals": false }
    }
  }
}
```

## Types de paramètres

| Type | Description | Contrôle applicable |
|------|-------------|---------------------|
| `string` | Chaîne de texte | Zone de texte / menu déroulant / sélecteur dynamique |
| `number` | Nombre | Saisie numérique (prend en charge les contraintes min/max) |
| `boolean` | Booléen | Bascule / case à cocher |

## Valeurs enum et valeurs personnalisées

```json
{
  "language": {
    "type": "string",
    "enum": ["en-US", "zh-CN", "ja-JP"],
    "allowCustom": true,
    "default": "en-US"
  }
}
```

- `enum` : Liste de valeurs prédéfinies suggérées. Affichées comme options sélectionnables dans le menu déroulant
- `allowCustom` (type string uniquement) : Lorsque défini à `true`, les valeurs `enum` sont des recommandations uniquement ; les utilisateurs peuvent librement saisir d'autres valeurs. Lorsque défini à `false` ou omis, les utilisateurs ne peuvent sélectionner que parmi les valeurs `enum`

## Affichage conditionnel

```json
{
  "advancedMode": {
    "type": "boolean",
    "title": "Advanced Mode",
    "default": false
  },
  "customEndpoint": {
    "type": "string",
    "title": "Custom Endpoint",
    "visible_if": { "parameter": "advancedMode", "equals": true }
  }
}
```

`visible_if` contrôle l'affichage/masquage des paramètres dans la boîte de dialogue de paramètres :

- `equals: true` — Afficher uniquement quand la valeur du paramètre cible est vraie (truthy)
- `equals: false` — Afficher uniquement quand la valeur du paramètre cible est fausse (falsy)

**Exemple : Affichage/masquage lié**

```json
{
  "auto_tag_regulator": {
    "type": "boolean",
    "title": "Auto Tag Regulator",
    "default": true
  },
  "auto_tag_infer_tag": {
    "type": "boolean",
    "title": "Infer tags",
    "default": true,
    "visible_if": { "parameter": "auto_tag_regulator", "equals": true }
  }
}
```

Lorsque `auto_tag_regulator` est décoché, le paramètre `auto_tag_infer_tag` est automatiquement masqué.

## Sources d'options dynamiques

Les options de valeur des paramètres peuvent provenir des données en direct de Zotero :

```json
{
  "targetCollection": {
    "type": "string",
    "title": "Target Collection",
    "default": "",
    "optionsSource": {
      "kind": "zotero.collections",
      "library": "current",
      "includeEmpty": true,
      "valueFormat": "collectionRef",
      "labelFormat": "path"
    }
  },
  "relatedTopic": {
    "type": "string",
    "title": "Related Topic",
    "optionsSource": {
      "kind": "synthesis.topics",
      "filter": "updatable"
    }
  }
}
```

### Sources d'options prises en charge

| `kind` | Description | Paramètres disponibles |
|--------|-------------|------------------------|
| `zotero.collections` | Liste des collections dans la bibliothèque Zotero courante | `library` (current/user/number), `includeEmpty`, `valueFormat` (collectionRef), `labelFormat` (path/title) |
| `synthesis.topics` | Liste des sujets dans le Synthesis Workbench | `filter` (all/updatable), `valueFormat` (topicId), `labelFormat` (title) |

### Paramètres optionsSource courants

| Paramètre | Description |
|-----------|-------------|
| `library` | Portée de la bibliothèque. `"current"` (bibliothèque courante), `"user"` (bibliothèque utilisateur), nombre (ID de bibliothèque spécifique) |
| `includeEmpty` | Inclure une option vide (pour « aucune sélection ») |
| `valueFormat` | Format des valeurs d'options : `"collectionRef"` / `"topicId"` |
| `labelFormat` | Format d'affichage des libellés d'options : `"path"` / `"title"` |
| `allowStale` | Autoriser l'utilisation de données en cache (éviter de redemander à chaque ouverture des paramètres) |
| `filter` | Condition de filtrage (varie selon le kind) |

## Contraintes pour les paramètres numériques

```json
{
  "confidence": {
    "type": "number",
    "title": "Confidence Threshold",
    "default": 0.8,
    "min": 0,
    "max": 1
  }
}
```

`min` et `max` contraignent la plage des valeurs d'entrée.

## Lecture des paramètres dans les hooks

Dans `buildRequest`, `filterInputs` et `applyResult`, vous pouvez lire les valeurs des paramètres définis par l'utilisateur via `executionOptions.workflowParams` :

```js
export function buildRequest({ executionOptions, runtime }) {
  const params = executionOptions?.workflowParams || {};
  const language = params.language || "en-US";
  const maxResults = params.maxResults || 10;

  return {
    kind: "skillrunner.job.v1",
    create: { skill_id: "my-skill" },
    parameter: { language, max_results: maxResults },
  };
}
```

## Localisation des paramètres

Le `title` et la `description` des paramètres prennent en charge la localisation :

```json
{
  "i18n": {
    "messages": {
      "zh-CN": {
        "parameters.language.title": "Language",
        "parameters.language.description": "Select the language for output content"
      }
    }
  }
}
```

Voir la page [Localisation](localization) pour le mécanisme complet de localisation.

## Prochaines étapes

- [Contexte de sélection](selection-context) — Comprendre comment la sélection d'éléments de l'utilisateur est transmise au workflow
- [Types de requêtes](request-kinds) — Méthodes de passage de paramètres pour les différents types de requêtes
