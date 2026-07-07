# Packaging & Deployment

Workflows support two forms: **single workflow** and **multi-workflow package**. Single workflows suit simple scenarios, while multi-workflow packages suit collections of workflows with shared code.

## Single Workflow

The simplest form: a directory containing a `workflow.json` and its Hook scripts:

```
my-workflow/
├── workflow.json
└── hooks/
    ├── buildRequest.mjs
    └── applyResult.mjs
```

A single workflow has no `packageId`, and Hook scripts cannot share code via relative imports.

## Multi-Workflow Package

When multiple workflows share logic, they can be organized as a package:

```
my-package/
├── workflow-package.json       # Package manifest
├── lib/                        # Shared code
│   └── runtime.mjs
│   └── util.mjs
├── workflow-a/
│   ├── workflow.json
│   └── hooks/
│       ├── preflight.mjs
│       ├── buildRequest.mjs
│       └── applyResult.mjs
├── workflow-b/
│   ├── workflow.json
│   └── hooks/
│       └── applyResult.mjs
└── locales/                    # Package-level localization files
    ├── zh-CN.json
    └── ja-JP.json
```

### workflow-package.json

```json
{
  "id": "my-package",
  "version": "1.0.0",
  "workflows": [
    "workflow-a/workflow.json",
    "workflow-b/workflow.json"
  ],
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json",
      "ja-JP": "locales/ja-JP.json"
    }
  }
}
```

### Shared Code Within a Package

Hook scripts in a package can import shared modules from `lib/` via relative paths:

```js
// workflow-a/hooks/applyResult.mjs
import { processResult } from "../../lib/util.mjs";

export async function applyResult({ parent, bundleReader, runtime }) {
  return processResult({ parent, bundleReader, runtime });
}
```

```js
// lib/util.mjs
export function processResult({ parent, bundleReader, runtime }) {
  // Shared processing logic
}
```

Note: Hook scripts are executed as ES Modules, supporting `import` statements, but import paths must be relative to the Hook file itself.

## Deployment Methods

### User Workflow Directory

Place the workflow directory under the **Workflow Directory** configured in Zotero Preferences. The Workflow Manager automatically scans this directory (including subdirectories) and discovers all `workflow.json` files.

Configuration location: Zotero → Settings → Zotero Agents → Workflow Directory.

### Directory Scanning Rules

- The Workflow Manager **recursively scans** the workflow directory and its subdirectories
- Finding a `workflow.json` registers it as a workflow
- If `workflow-package.json` is found within a package directory, sub-workflows are loaded in package mode
- If the workflow directory does not exist or contains no valid workflows, the Workflow Manager reports a warning but does not affect plugin operation

### Compatibility with Other Formats

| Storage Location | Visibility | Description |
|-----------------|------------|-------------|
| Official Workflow Package `content/official/workflows/` | All users | Installed independently via Content Feed; not directly modifiable by users |
| User Workflow Directory | Current user | Can be freely added/modified/deleted |
| Official + User directories | Combined display | Workflows from both locations are displayed side by side in the Dashboard |

## Validation

After deploying a workflow to the user directory:

1. **Reopen the Dashboard**; the new workflow should appear in the Home page's workflow list
2. After selecting matching items, right-click → Zotero Agents; the new workflow should appear
3. Before running the workflow, check that parameters in the settings dialog are correct

## Next Steps

- [Localization](#doc/workflows%2Fcustom%2Flocalization) — Add multi-language support to workflows
- [Request Kinds](#doc/workflows%2Fcustom%2Frequest-kinds) — Choose the appropriate execution backend and request type
- [Debugging & Testing](#doc/workflows%2Fcustom%2Fdebugging) — Verify workflow correctness
