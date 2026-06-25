# Writing the Workflow Manifest

`workflow.json` is the manifest file for a workflow, defining all its metadata and behavior. The Workflow Manager discovers and loads workflows through this file.

## Basic Structure

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

## Field Reference

### Basic Identification

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `id` | ✅ | string | Unique identifier; must not be duplicated. kebab-case recommended |
| `label` | ✅ | string | User-visible display name |
| `version` | | string | Semantic version number, e.g., `"1.0.0"` |
| `provider` | ✅ | string | Backend type. See below for available values |

### Provider Values

| Value | Description |
|-------|-------------|
| `"pass-through"` | Pure local execution, no backend needed. Suitable for file operations, exports, etc. |
| `"skillrunner"` | Execute skills via the Skill-Runner backend |
| `"acp"` | Execute skills via the ACP backend |
| `"generic-http"` | Call APIs via the Generic HTTP backend |

`provider` determines which backend types the workflow is compatible with, and also determines which backends are shown as executable in the Dashboard.

### Display Control

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

| Field | Type | Description |
|-------|------|-------------|
| `display.core` | boolean | Whether to mark as a core workflow (prioritized display in Dashboard, with a core badge) |
| `display.emoji` | string | Display name prefix icon, e.g., `"📖"` |
| `taskNameTemplate` | string | Task name template using `{parameter name}` placeholders, replaced with actual values at execution time |
| `debug_only` | boolean | When `true`, only visible in debug mode |

### Input Definition

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

| Field | Description |
|-------|-------------|
| `unit` | **Input unit type**. `"attachment"` (attachment), `"parent"` (parent item), `"note"` (note), `"workflow"` (no item selection needed, triggered directly from Dashboard) |
| `accepts.mime` | Accepted MIME types (only applicable when `unit: "attachment"`). If not specified, all types are accepted |
| `per_parent.min` | Minimum number of attachments per parent item |
| `per_parent.max` | Maximum number of attachments per parent item |

When `unit: "workflow"`, no user-selected items are required to trigger (e.g., "Create Topic Synthesis").

### <a id="selection-validation"></a>validateSelection — Selection Validation

`validateSelection` is declarative selection validation. It covers common scenarios like "skip items that already have results" or "only accept selections of specific types" — without writing any JavaScript.

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

### `select` — Selection Policy

| Field | Type | Description |
|-------|------|-------------|
| `select.policy` | string | Selection policy. Supported values below |
| `select.unit` | string | Override the input unit for selection validation. `"attachment"` / `"parent"` / `"note"` / `"workflow"` |

**Supported `select.policy` values:**

| Policy | Description |
|--------|-------------|
| `input-unit` | Accept items matching the input unit |
| `literature-source` | Accept literature sources (attachments or parent items with expandable attachments) |
| `pdf-attachment` | Accept only PDF attachments |
| `selected-parent` | Accept parent items from the selection |
| `generated-note-candidates` | Accept candidate items for generated notes |
| `digest-representative-image` | Target items for representative image extraction |

### `require` — Selection Requirements

| Field | Type | Description |
|-------|------|-------------|
| `require.counts.parents` | number | Minimum required parent items |
| `require.counts.attachments` | number | Minimum required attachment items |
| `require.counts.notes` | number | Minimum required note items |
| `require.counts.children` | number | Minimum required child items |
| `require.counts.total` | number | Minimum total required items |
| `require.allowMixed` | boolean | Whether mixing different item types in selection is allowed |

### `exclude` — Exclusion Rules

| Field | Type | Description |
|-------|------|-------------|
| `exclude[]` | array | List of exclusion rules. If any rule matches, the current item is skipped |

**Supported `exclude.kind` values:**

| kind | Description | Additional Parameters |
|------|-------------|----------------------|
| `generated-notes-all` | The item already has generated notes of the specified type | `noteKinds`: list of note types, e.g., `["digest", "references", "citation-analysis"]` |
| `artifact-exists` | The item already has the specified artifact (to avoid redundant execution) | `target`: `"deep-reading-html"` / `"translator-markdown"` / `"mineru-markdown"`; `parameter`: optional language parameter for artifact matching |

### `derive` — Derived Selections

| Field | Type | Description |
|-------|------|-------------|
| `derive[]` | array | Derived selection operations. `"exportCandidates"` — derive candidates for note export; `"digestRepresentativeImageTarget"` — derive representative image targets from digest notes |

**Example:**

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

> In this example, items that already have the deep reading HTML artifact are automatically skipped, without requiring manual filtering by the user.

### Trigger Control

```json
{
  "trigger": {
    "requiresSelection": false
  }
}
```

| Field | Description |
|-------|-------------|
| `requiresSelection` | Whether user-selected items are required to trigger. Defaults to `true`. When set to `false`, the workflow can be run from the Dashboard without selecting any items. Usually set to `false` when `inputs.unit: "workflow"` |

### Execution Control

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

| Field | Description |
|-------|-------------|
| `timeout_ms` | Timeout in milliseconds (only effective for Generic HTTP backends) |
| `poll_interval_ms` | Polling interval in milliseconds, controls progress check frequency |
| `mcp.requiredTools` | MCP tools required by this workflow (array of tool name strings) |
| `zoteroHostAccess.required` | Whether Zotero host access is required (to read/write library data) |
| `zoteroHostAccess.allowWriteApprovalBypass` | Whether write operation approval bypass is allowed |
| `feedback.showNotifications` | Whether to show execution notifications. Defaults to `true`; set to `false` to run silently |

> **Execution mode** (`auto` / `interactive`) has been moved to `request.create.mode` — see [Request Kinds](request-kinds).

### Result Retrieval

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

| Field | Description |
|-------|-------------|
| `fetch.type` | Retrieval method. `"bundle"` (download zip bundle), `"result"` (only retrieve result JSON) |
| `final_step_id` | For sequence workflows, specifies the id of the final step, used to determine the final result |
| `expects.result_json` | Expected result JSON file path (relative to the runtime workspace) |
| `expects.artifacts` | List of expected artifact file paths |

### Request Definition

Declarative request definition, **mutually exclusive** with `hooks.buildRequest` (if both exist, `hooks.buildRequest` takes priority).

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

For detailed information on each `kind`, see [Request Kinds](request-kinds).

### Hook Declaration

```json
{
  "hooks": {
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `applyResult` | ✅ | **Required**. Script path for post-execution result handling |
| `buildRequest` | | Optional. Build the request to be sent to the backend. Mutually exclusive with the `request` field |
| `normalizeSettings` | | Optional. Normalize user-set parameters |

> **Input filtering** has been replaced by the declarative `validateSelection` mechanism — see [Selection Validation](#selection-validation) below.

Paths are relative to the directory containing `workflow.json`.

### Localization

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

See the [Localization](localization) page for detailed information.

### Complete Example: A Literature Analysis Workflow with Parameters

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

## Next Steps

- [Hook System](hooks) — Learn the API signatures and writing methods for each Hook
- [Parameter System](parameters) — Parameter types, enum values, dynamic option sources
- [Selection & Context](selection-context) — How to obtain information about user-selected items
