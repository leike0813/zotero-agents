# Debug Sequence Probe

## Overview

This subsystem provides debugging infrastructure for `skillrunner.sequence.v1`
workflow orchestration. It has two parts:

1. **Debug Sequence Probe Skills** — three debug-only builtin skills (emit,
   check, finalize) that exercise serial execution, workspace reuse, and
   handoff/context isolation through real workflow manifests.
2. **Workflow Debug Probe Tool** (`workflowDebugProbe.ts`) — diagnostic probe
   for workflow developers that tests whether a workflow can execute in the
   current selection context, without actually submitting a job.

---

## Debug Sequence Probe Skills

Three builtin skills under `skills_builtin/debug-sequence-probe-*`. All declare
`debug_only: true` in `runner.json` — they are visible only when debug mode is
enabled.

| Skill | Id | Role |
|-------|----|------|
| Emit | `debug-sequence-probe-emit` | Emits structured markers, optionally writes a workspace sentinel file |
| Check | `debug-sequence-probe-check` | Validates handoff mapping and workspace sentinel state |
| Finalize | `debug-sequence-probe-finalize` | Summarizes previous checks for workflow applyResult |

### Common Output Schema

All three skills share an `assets/output.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["kind", "probe_id", "status", "checks", "diagnostics"],
  "properties": {
    "kind": { "const": "debug_sequence_probe_result" },
    "probe_id": { "type": "string" },
    "status": { "enum": ["ok", "failed"] },
    "public_marker": { "type": "string" },
    "secret_marker": { "type": "string" },
    "sentinel_path": { "type": "string" },
    "workspace_cwd": { "type": "string" },
    "checks": { "type": "array" },
    "diagnostics": { "type": "array" }
  }
}
```

### Emit

**Input:** `parameter.probe_id`, `parameter.public_marker`, `parameter.secret_marker`.

**Behavior:**
1. Set `probe_id`, `public_marker`, `secret_marker` from parameters.
2. If `parameter.write_sentinel` is true, create `parameter.sentinel_path` as a JSON file containing these fields.
3. Return `status: "ok"` with the emitted markers and a checks array.

### Check

**Input:** `parameter.probe_id`, handoff from previous step, workspace sentinel path.

**Behavior:**
1. Check handoff presence against `parameter.expect_handoff_present`.
2. Validate public_marker against `parameter.expected_public_marker`.
3. Validate secret_marker (or verify absence when `parameter.forbid_secret_marker` is true).
4. Check workspace sentinel existence against `parameter.expected_sentinel` (`"present"` or `"absent"`).
5. Return `status: "ok"` only if all checks pass; otherwise `status: "failed"`.

### Finalize

**Input:** handoff containing previous check results.

**Behavior:**
1. Read previous check data from `input.handoff`.
2. If `input.handoff.status` is `failed`, return `status: "failed"`.
3. Optionally check sentinel path using the same present/absent semantics.
4. Include previous and finalizer checks in the output.

---

## Debug Sequence Workflows

The `workflows_builtin/workflow-debug-probe` package contains three sequence
workflows in addition to the original debug probe workflow.

| Workflow | Sequence | Test Target |
|----------|----------|-------------|
| Linear Probe | emit → check → finalize (3 steps) | Serial execution with handoff |
| Workspace Reuse | emit → check → finalize (reuse-workspace) | Downstream `reuse-workflow` workspace intent |
| Context Isolation | emit → check → finalize (explicit handoff, pass-through disabled) | Handoff mapping with filtered context |

All three declare `skillrunner.sequence.v1` request kind and use
`execution.skillrunner_mode = "auto"` (sequence continuation does not yet
support deferred interactive steps).

---

## Workflow Debug Probe Tool

`src/modules/workflowDebugProbe.ts`

A diagnostic tool that performs a dry-run analysis of all workflows against
the current selection context. It is installed as a workflow editor host
renderer via `installWorkflowDebugProbeBridge()`.

### Key Types

```typescript
type WorkflowDebugProbeCheck = {
  workflowId: string;
  workflowLabel: string;
  packageId?: string;
  workflowSource: string;         // "builtin" | "user"
  executionMode?: string;
  contract?: string;              // requestKind
  provider?: string;              // resolved provider id
  canRun: boolean;
  disabledReason?: string;        // why the workflow cannot run
  failedStage?: string;           // which stage failed
  requestCount?: number;
  hostApiVersion?: number;
  hostApiSummary: Record<string, unknown>;
  runtimeCapabilitySummary?: Record<string, unknown>;
  compiledHookSource?: string;
  capabilitySource?: string;
  error?: { message?: string; stack?: string };
};

type WorkflowDebugProbeResult = {
  generatedAt: string;
  debugMode: boolean;
  selectionSummary: {
    selectionType: string;
    selectedItemIds: number[];
    summary: Record<string, unknown>;
    warnings: string[];
  };
  runtimeSummary: {
    builtinWorkflowsDir: string;
    workflowsDir: string;
    loadedWorkflowCount: number;
    loadedBuiltinWorkflowCount: number;
    loadedUserWorkflowCount: number;
    zoteroVersion?: string;
    latestBuiltinSync?: unknown;
  };
  workflowChecks: WorkflowDebugProbeCheck[];
};
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `collectWorkflowDebugProbeChecks(args)` | Iterates all workflows (or a specified list), resolves execution context, checks provider compatibility, compiles hooks, and diagnoses failure reasons without submitting any job. |
| `runWorkflowDebugProbe(args)` | Builds selection context, collects checks, returns the full result with runtime summary. |
| `installWorkflowDebugProbeBridge()` | Registers a workflow editor renderer that opens the debug probe dialog. |

### Diagnostic Flow

```
runWorkflowDebugProbe(selectionContext)
  → build selection summary
  → for each workflow:
      → resolve execution context (backend, requestKind, provider)
      → compile hooks
      → check provider compatibility
      → collect hostApi and runtime capability summaries
      → set canRun / disabledReason
  → return WorkflowDebugProbeResult
```

---

## Debug-only Visibility

Skills can be marked as debug-only by declaring `debug_only: true` in
`runner.json`:

```json
{
  "id": "debug-sequence-probe-emit",
  "debug_only": true,
  "execution_modes": ["auto"],
  ...
}
```

The plugin skill registry enforces this at scan time:

```
Debug Mode OFF:
  scanPluginSkillRegistry()
    → filters out entries where runner.json.debug_only === true
    → debug-sequence-probe-* NOT in registry
    → ACP shared catalog materialization excludes them

Debug Mode ON:
  scanPluginSkillRegistry()
    → includes debug_only entries
    → debug-sequence-probe-* in registry
    → ACP shared catalog materialization includes them
```

Note: the debug probe **workflows** are always visible in the workflow
registry. However, since the probe skills they depend on are hidden in
non-debug mode, the workflows effectively cannot execute.

---

## Integration Diagram

```
┌────────────────────────────────────────────────────────────┐
│                    Debug Probe Skills                       │
│                                                            │
│  debug-sequence-probe-emit  (emit markers + sentinel)      │
│  debug-sequence-probe-check (validate handoff + sentinel)  │
│  debug-sequence-probe-finalize (summarize checks)          │
│                                                            │
│  All declare debug_only: true → filtered by registry       │
└──────────┬─────────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────────┐
│               Debug Sequence Workflows                      │
│  (workflows_builtin/workflow-debug-probe/)                  │
│                                                            │
│  linear-probe:        emit → check → finalize              │
│  workspace-reuse:     emit → check → finalize (reuse)      │
│  context-isolation:   emit → check → finalize (handoff)    │
│                                                            │
│  All declare skillrunner.sequence.v1                       │
└──────────┬─────────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────────┐
│            Workflow Debug Probe Tool                        │
│  (workflowDebugProbe.ts)                                    │
│                                                            │
│  collectWorkflowDebugProbeChecks() → dry-run analysis      │
│  runWorkflowDebugProbe() → full diagnostic result          │
│  installWorkflowDebugProbeBridge() → editor host dialog    │
└────────────────────────────────────────────────────────────┘
```
