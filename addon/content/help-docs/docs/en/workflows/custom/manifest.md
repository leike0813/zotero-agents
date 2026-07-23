# Writing the Workflow Manifest

`workflow.json` is the manifest file for a workflow, defining all its metadata and behavior. The Workflow Manager discovers and loads workflows through this file.

## Basic Structure

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

`inputs` is the consumer contract: it declares the atomic member received by
request construction and preflight, plus how members form top-level execution
units. It does not validate the raw Zotero selection.

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

| Field | Description |
|-------|-------------|
| `member.kind` | Atomic candidate type: `selection`, `parent`, `child`, `attachment`, `note`, `generated-note`, or `digest-image-target` |
| `member.accepts.mime` | MIME types accepted by an attachment execution member. Invalid for other member kinds |
| `grouping.mode` | `each` creates one unit per candidate; `all` creates one aggregate unit; `parent` creates stable parent groups |

For `grouping: parent`, candidates without a stable parent identity are skipped
as `missing-parent`; they are never merged into an anonymous group.

### validateSelection — Selection Validation {#selection-validation}

`validateSelection` is the candidate-production contract. It validates the raw
selection once, produces ordered atomic candidates, applies ordered filters,
then validates the remaining candidate count. It does not declare grouping.

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
        "kind": "generated-note-kinds-absent",
        "phase": "availability",
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
| `select.source` | string | For `input-member`, use only explicit `selected` members or expand stable `related` members |

**Supported `select.policy` values:**

| Policy | Description |
|--------|-------------|
| `input-member` | Produce the member kind declared by `inputs.member.kind` from `selected` or `related` context |
| `selection` | Produce the entire SelectionContext; requires `member.kind: selection` and `grouping.mode: all` |
| `literature-source` | Produce one representative attachment for each literature source |
| `generated-note-candidates` | Accept candidate items for generated notes |
| `digest-representative-image` | Target items for representative image extraction |

### `require` — Selection Requirements

| Field | Type | Description |
|-------|------|-------------|
| `require.selection.counts.<kind>` | CountRule | Raw selection cardinality for parents, children, attachments, notes, or total |
| `require.selection.allowMixed` | boolean | Whether multiple raw selection kinds are allowed |
| `require.candidates` | CountRule | Cardinality after selection, compatibility, and filters |

A CountRule is either `{ "exact": n }` or `{ "min": n, "max": n }`, using
non-negative integers. `exact` cannot be combined with `min` or `max`.

### `filters` — Ordered Candidate Filters

Filters record the first skip reason for each candidate. Availability filters
run in preview and again during confirmed execution; execute filters run only
after settings are confirmed.

| kind | Purpose |
|------|---------|
| `source-file-exists` | Require the source attachment file to exist |
| `candidates-per-parent` | Enforce candidate cardinality independently for each parent |
| `generated-note-kinds-absent` | Keep candidates whose parent does not already contain every declared generated-note kind |
| `artifact-absent` | Keep candidates whose declared artifact is absent; parameter-dependent rules require `phase: "execute"` |

**Example:**

```json
{
  "validateSelection": {
    "select": { "policy": "literature-source" },
    "filters": [
      {
        "kind": "artifact-absent",
        "phase": "availability",
        "target": "deep-reading-html"
      }
    ]
  }
}
```

> In this example, candidates that already have the deep-reading HTML artifact
> are skipped before grouping.

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
| `requiresSelection` | Required in schema v2. It controls only the empty-selection trigger gate; selection requirements may still reject a concrete selection |

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

> **Execution mode** (`auto` / `interactive`) has been moved to `request.create.mode` — see [Request Kinds](#doc/workflows%2Fcustom%2Frequest-kinds).

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

For detailed information on each `kind`, see [Request Kinds](#doc/workflows%2Fcustom%2Frequest-kinds).

### Hook Declaration

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

| Field | Required | Description |
|-------|----------|-------------|
| `applyResult` | ✅ | **Required**. Script path for post-execution result handling |
| `preflight` | | Optional. Runs after grouping and before request construction. It can continue, skip, short-circuit to `applyResult`, or expand requests inside the same top-level unit |
| `buildRequest` | | Optional. Build the request to be sent to the backend. Mutually exclusive with the `request` field |
| `normalizeSettings` | | Optional. Normalize user-set parameters |

`preflight` does not participate in menu enablement, debug-probe selection
classification, or Host Bridge readiness checks. Keep candidate production in
`validateSelection`, grouping in `inputs`, provider request construction in
`buildRequest` or `request`, and Zotero writes in `applyResult`.

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

See the [Localization](#doc/workflows%2Fcustom%2Flocalization) page for detailed information.

### Complete Example: A Literature Analysis Workflow with Parameters

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

## Next Steps

- [Hook System](#doc/workflows%2Fcustom%2Fhooks) — Learn the API signatures and writing methods for each Hook
- [Parameter System](#doc/workflows%2Fcustom%2Fparameters) — Parameter types, enum values, dynamic option sources
- [Selection & Context](#doc/workflows%2Fcustom%2Fselection-context) — How to obtain information about user-selected items
