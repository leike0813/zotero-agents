# Parameter System

Workflows can define configurable parameters that pop up a settings dialog for the user to fill in before running. The parameter system supports multiple types and dynamic data sources.

## Parameter Definition

Parameters are defined in the `parameters` field of `workflow.json`:

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

## Parameter Types

| Type | Description | Applicable Control |
|------|-------------|-------------------|
| `string` | Text string | Text box / dropdown / dynamic selector |
| `number` | Number | Number input (supports min/max constraints) |
| `boolean` | Boolean | Toggle / checkbox |

## Enum Values and Custom Values

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

- `enum`: Suggested preset values list. Displayed as selectable options in the dropdown menu
- `allowCustom` (string type only): When set to `true`, `enum` values are recommendations only; users can freely input other values. When set to `false` or omitted, users can only select from `enum`

## Conditional Display

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

`visible_if` controls the show/hide of parameters in the settings dialog:

- `equals: true` — Display only when the target parameter value is truthy
- `equals: false` — Display only when the target parameter value is falsy

**Example: Linked Show/Hide**

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

When `auto_tag_regulator` is unchecked, the `auto_tag_infer_tag` parameter is automatically hidden.

## Dynamic Option Sources

Parameter value options can come from Zotero's live data:

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

### Supported Option Sources

| `kind` | Description | Available Parameters |
|--------|-------------|---------------------|
| `zotero.collections` | List of collections in the current Zotero library | `library` (current/user/number), `includeEmpty`, `valueFormat` (collectionRef), `labelFormat` (path/title) |
| `synthesis.topics` | List of topics in the Synthesis Workbench | `filter` (all/updatable), `valueFormat` (topicId), `labelFormat` (title) |

### Common optionsSource Parameters

| Parameter | Description |
|-----------|-------------|
| `library` | Library scope. `"current"` (current library), `"user"` (user library), number (specific library ID) |
| `includeEmpty` | Whether to include an empty option (for "no selection") |
| `valueFormat` | Format of option values: `"collectionRef"` / `"topicId"` |
| `labelFormat` | Display format of option labels: `"path"` / `"title"` |
| `allowStale` | Allow use of cached data (avoid re-requesting every time settings are opened) |
| `filter` | Filter condition (varies by kind) |

## Constraints for Numeric Parameters

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

`min` and `max` constrain the range of input values.

## Reading Parameters in Hooks

In `buildRequest`, `filterInputs`, and `applyResult`, you can read user-set parameter values via `executionOptions.workflowParams`:

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

## Parameter Localization

The `title` and `description` of parameters support localization:

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

See the [Localization](#doc/workflows%2Fcustom%2Flocalization) page for the complete localization mechanism.

## Next Steps

- [Selection Context](#doc/workflows%2Fcustom%2Fselection-context) — Understand how the user's item selection is passed to the workflow
- [Request Kinds](#doc/workflows%2Fcustom%2Frequest-kinds) — Parameter passing methods for different request kinds
