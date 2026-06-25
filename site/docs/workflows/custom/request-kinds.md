# Request Kinds

Workflows determine which Provider (executor) handles the request by declaring `request.kind`. The system has multiple built-in request kinds, corresponding to different backends and execution modes.

## Request Kinds Overview

| `kind` | Applicable Provider | Description |
|--------|--------------------|-------------|
| `pass-through.run.v1` | pass-through | Pure local execution, no remote backend involved |
| `skillrunner.job.v1` | skillrunner / acp | Single-step SkillRunner skill execution |
| `skillrunner.sequence.v1` | acp | Multi-step chained skill execution |
| `acp.prompt.v1` | acp | Send a prompt directly to the ACP backend |
| `acp.skill.run.v1` | acp | Submit a skill run directly to the ACP backend |
| `generic-http.request.v1` | generic-http | Single-step HTTP API call |
| `generic-http.steps.v1` | generic-http | Multi-step HTTP API calls |

## pass-through.run.v1 — Pure Local Execution

No remote backend required; executes directly within the plugin. Suitable for pure local scenarios like file operations and data export.

```json
{
  "provider": "pass-through",
  "request": {
    "kind": "pass-through.run.v1"
  }
}
```

When constructing the request in the `buildRequest` hook, typically pass `selectionContext` and `parameter`:

```js
export function buildRequest({ selectionContext, executionOptions }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

## skillrunner.job.v1 — Single-Step Skill Execution

Submit a single skill execution request to the Skill-Runner backend. Polls for results after submission.

```json
{
  "provider": "skillrunner",
  "request": {
    "kind": "skillrunner.job.v1",
    "create": {
      "skill_id": "literature-analysis",
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

| Field | Description |
|-------|-------------|
| `create.skill_id` | Identifier of the skill to execute |
| `create.skill_source` | Skill source. `"local-package"` (bundled with package), `"installed"` (already installed) |
| `input.upload.files` | List of files to upload. `from` can be `"selected.markdown"`, `"selected.pdf"`, `"selected.source"` |
| `poll.interval_ms` | Polling interval (milliseconds) |
| `poll.timeout_ms` | Total timeout (milliseconds) |

When the workflow selects the ACP backend, `skillrunner.job.v1` automatically adapts to `acp.skill.run.v1`, so workflows declared as `skillrunner.job.v1` are also compatible with the ACP backend.

## skillrunner.sequence.v1 — Multi-Step Skill Chaining

When multiple skills need to be chained in sequence (where the output of one step becomes the input of the next), use sequence execution. Typical scenarios include multi-stage pipelines (e.g., the three-step flow of Topic Synthesis: prepare → core enrichment → finalize), where each step is handled by a different skill, passing intermediate results via the handoff mechanism.

Chain multiple skills in sequence, where the output of one step can serve as the input of the next (handoff).

```json
{
  "provider": "acp",
  "request": {
    "kind": "skillrunner.sequence.v1",
    "sequence": {
      "steps": [
        {
          "id": "prepare",
          "skill_id": "create-topic-synthesis-prepare",
          "workspace": "new",
          "parameter": { "language": "en-US" }
        },
        {
          "id": "core",
          "skill_id": "topic-synthesis-core-enrichment",
          "workspace": "reuse-workflow",
          "handoff": {
            "from_step": "prepare",
            "pass_through": true
          }
        },
        {
          "id": "finalize",
          "skill_id": "topic-synthesis-finalize",
          "workspace": "reuse-workflow"
        }
      ]
    }
  }
}
```

### Step Configuration

| Field | Description |
|-------|-------------|
| `id` | Unique identifier for the step, referenced by handoff |
| `skill_id` | Identifier of the skill to execute |
| `mode` | **Required.** Execution mode: `"auto"` (non-interactive) or `"interactive"` (requires user input) |
| `workspace` | Workspace policy. `"new"` (create a new workspace), `"reuse-workflow"` (reuse the parent workspace) |
| `parameter` | Parameters passed to the skill |
| `input` | Input data passed to the skill |
| `short_circuit` | Early termination rules. See below |
| `fetch_type` | Specify fetch type per step. `"bundle"` (download zip artifact bundle); if not specified, uses the workflow-level `result.fetch.type` |
| `apply_result` | Step-level result application: `workflow_id` specifies which sub-workflow's `applyResult` to invoke; `on_failure` controls behavior on failure (`"continue"` or `"fail_sequence"`) |
| `include_if` | Conditional step execution. Either `{ kind: "parameter", parameter: "...", equals: ... }` to check a workflow parameter, or `{ kind: "runtime", condition: "..." }` for runtime conditions |

### Early Termination (short_circuit)

When the return value of a step satisfies conditions, skip subsequent steps and use the current step's output as the final result.

```json
{
  "id": "prepare",
  "skill_id": "create-topic-synthesis-prepare",
  "workspace": "new",
  "short_circuit": {
    "when": {
      "path": "status",
      "equals": "canceled"
    },
    "result": "step_output"
  }
}
```

| Field | Description |
|-------|-------------|
| `when.path` | Which field in the step output JSON to check |
| `when.equals` | Trigger termination when the field value equals this value |
| `result` | Result after termination: `"step_output"` (current step's complete output) |

### Handoff Configuration

Handoff passes data from one step to subsequent steps via a `bindings` array. Each binding describes a single value or file transfer.

**Full pass-through (all output fields from a preceding step):**

```json
{
  "handoff": {
    "bindings": [
      {
        "kind": "value",
        "target": "/input/handoff"
      }
    ]
  }
}
```

**Selective field mapping:**

```json
{
  "handoff": {
    "bindings": [
      {
        "kind": "value",
        "step": "step1",
        "source": "output_field_name",
        "target": "/input/field_name",
        "required": false
      },
      {
        "kind": "value",
        "step": "step1",
        "source": "status",
        "target": "/input/step1_status",
        "required": false
      }
    ]
  }
}
```

| Binding Field | Description |
|---------------|-------------|
| `kind` | `"value"` for data values, `"file"` for file references |
| `step` | Source step ID (which step's output to read from). If omitted, reads from the immediate preceding step |
| `source` | Field name in the source step's output JSON |
| `target` | JSON path where the value should be written in the current step's input (e.g., `"/input/field_name"`) |
| `required` | If `true`, the step will fail when the source value is missing. Defaults to `false` |
| `value` | For `kind: "value"`, a literal value to pass (used when `step`/`source` are omitted) |

## generic-http.request.v1 — HTTP API Call

Send a single HTTP request to the Generic HTTP backend.

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.request.v1"
  }
}
```

Commonly used to call external REST APIs (e.g., MinerU PDF parsing service).

## generic-http.steps.v1 — Multi-Step HTTP Calls

Execute multiple HTTP request steps in sequence.

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.steps.v1"
  }
}
```

## How to Choose the Right Provider

| Your workflow needs to... | Choose provider | Request kind |
|--------------------------|----------------|--------------|
| Perform pure local operations, no remote calls | `pass-through` | `pass-through.run.v1` |
| Submit a single skill to Skill-Runner | `skillrunner` | `skillrunner.job.v1` |
| Chain multiple skills in sequence | `acp` | `skillrunner.sequence.v1` |
| Call an HTTP API | `generic-http` | `generic-http.request.v1` |

Note: `provider` is the sole field that determines which backends a workflow is compatible with. `request.kind` is only used for routing to the correct executor and does not participate in backend compatibility inference.

## Next Steps

- [Debugging & Testing](debugging) — Verify workflow requests and responses
- [Packaging & Deployment](packaging) — Publish workflows for users
