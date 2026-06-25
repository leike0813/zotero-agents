# Custom Workflow Architecture Overview

Zotero Agents' workflow system uses a **pluggable architecture** — each workflow is an independent, self-contained directory requiring only a `workflow.json` manifest file and corresponding Hook scripts. The plugin's Workflow Manager automatically discovers and loads it.

## Directory Structure

Workflows can be stored in two locations:

| Location | Type | Description |
|----------|------|-------------|
| Official Workflow Package | Official | Installed independently via Content Feed. Located at `<Zotero Data>/zotero-agents/content/official/workflows/` |
| User workflow directory | Custom | Configured in preferences; the Workflow Manager automatically scans it |

The plugin's **Workflow Manager** recursively scans the official package directory and user workflow directory, discovers `workflow.json` files, and registers them as available workflows.

## A Minimal Workflow Example

Creating a custom workflow requires only **2 files**:

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

After placing `my-workflow/` in the user workflow directory, reopen the Dashboard to see the workflow.

## Workflow Architecture Layers

A workflow's lifecycle involves the following layers:

```
User Action (Right-click / Dashboard)
    │
    ▼
Workflow Manager — Discover, load, validate
    │
    ├── Inputs — What items did the user select?
    ├── Parameters — What parameters did the user set?
    ├── Hooks — Preprocessing, request building, result handling
    └── Execution — Dispatched to a backend by the Provider
         │
         ▼
      Provider (SkillRunner / ACP / Generic HTTP / Pass-through)
         │
         ▼
      Backend — Remote or local execution engine
```

## Workflow Pattern Classification

Based on execution method and backend type, workflows can be classified as follows:

| Pattern | Typical Use Case | Backend Type |
|---------|-----------------|--------------|
| **pass-through** | Pure local operations (export, file processing), no remote backend needed | None |
| **skillrunner.job.v1** | Single-step skill execution submitted to SkillRunner | skillrunner / acp |
| **skillrunner.sequence.v1** | Multi-step chained skill execution, with relay between steps | acp |
| **generic-http.request.v1** | Single HTTP API call | generic-http |
| **generic-http.steps.v1** | Multi-step HTTP API calls | generic-http |

## Core Concepts of workflow.json

```json
{
  "id": "unique identifier",
  "label": "display name",
  "provider": "backend type",
  "inputs": { "unit": "input unit type" },
  "parameters": { /* configurable parameters */ },
  "execution": { /* execution control */ },
  "request": { "kind": "request kind" },
  "hooks": { "applyResult": "script path for result handling" }
}
```

The next page explains the meaning and usage of each field in detail.

## Next Steps

- [Writing the Workflow Manifest](#doc/workflows%2Fcustom%2Fmanifest) — Detailed explanation of each field in workflow.json
- [Hook System](#doc/workflows%2Fcustom%2Fhooks) — How to write hooks for each stage
- [Parameter System](#doc/workflows%2Fcustom%2Fparameters) — Define configurable parameters
