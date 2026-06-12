# Host Bridge Prompt Injection

## Overview

This subsystem controls whether and how ACP agents access Zotero through the
Host Bridge during skill runs. It manages the full pipeline from workflow
manifest declaration to CLI injection materialization.

Design principles:

- **The `zotero-bridge-cli` wrapper skill is the sole source of Host Bridge
  command guidance.** Engine instruction files (CLAUDE.md, AGENTS.md, etc.)
  must not contain Host Bridge command snippets.
- Injection scope is controlled by the workflow manifest's `zoteroHostAccess`
  declaration.
- Write auto-approval is double-gated: the manifest must declare
  `allowWriteApprovalBypass: true` AND the user must explicitly enable
  auto-approve in the submit dialog or settings.

Seven modules implement this subsystem:

| Module | File | Role |
|--------|------|------|
| CLI injection materializer | `src/modules/hostBridgeCliInjection.ts` | Creates `.zotero-bridge/` directory, profile, shims, env |
| Access option parser | `src/workflows/zoteroHostAccessOptions.ts` | `WorkflowRunOptions`, `required` resolution, runtime_options builder |
| Orchestrator | `src/modules/acpSkillRunnerOrchestrator.ts` | Resolves requirement, triggers injection, binds env to backend |
| Request adapter | `src/modules/acpSkillRunRequestAdapter.ts` | Injects `runtime_options.zotero_host_access` into ACP requests |
| Write auto-approval registry | `src/modules/hostBridgeWriteAutoApprovalRegistry.ts` | Registers and checks auto-approval scope |
| Permission manager | `src/modules/hostBridgePermissionManager.ts` | Routes permission requests by scope |
| Manifest declaration type | `src/workflows/types.ts` | `WorkflowExecutionSpec.zoteroHostAccess` |

---

## Workflow Declaration

Workflow manifests declare zotero host access intent in
`workflow.manifest.execution.zoteroHostAccess`:

```typescript
// src/workflows/types.ts
export type WorkflowExecutionSpec = {
  zoteroHostAccess?: {
    required?: boolean;                 // defaults to true
    allowWriteApprovalBypass?: boolean;  // defaults to false
  };
};
```

| Field | Default | Meaning |
|-------|---------|---------|
| `required` | `true` | Controls whether Host Bridge CLI is injected. `true` = inject; `false` = skip all injection. |
| `allowWriteApprovalBypass` | `false` | Allows write auto-approval. When `true`, the UI exposes an auto-approve option in the submit dialog. |

---

## Runtime Options Resolution

`buildZoteroHostAccessRuntimeOptions()` in
`src/workflows/zoteroHostAccessOptions.ts` (line 133) reads the manifest
declaration + user run options and produces the `runtime_options.zotero_host_access`
payload sent to ACP backends:

```typescript
{
  required: boolean,              // resolveWorkflowZoteroHostAccessRequired()
  auto_approve_writes?: true,     // only if extractAutoApproveZoteroWrites() returns true
}
```

### Key Functions

| Function | Line | Purpose |
|----------|------|---------|
| `resolveWorkflowZoteroHostAccessRequired()` | zoteroHostAccessOptions.ts:67 | Returns `declaration.required` if explicitly set, otherwise `true` |
| `extractAutoApproveZoteroWrites()` | zoteroHostAccessOptions.ts:47 | Returns `true` only if `workflowAllowsWriteApprovalBypass()` AND `runOptions.autoApproveWrites === true` |
| `buildWorkflowRunOptionsForUi()` | zoteroHostAccessOptions.ts:98 | Exposes UI options only when the workflow allows write bypass |
| `normalizeWorkflowRunOptions()` | zoteroHostAccessOptions.ts:77 | Parses raw `zoteroHostAccess` and `autoApproveWrites` into `WorkflowRunOptions` |

### SkillRunner Compatibility

`SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS = false` (line 10).
For SkillRunner backend jobs, `runtime_options.zotero_host_access` and the
`autoApproveZoteroWrites` parameter are stripped from the request by
`stripZoteroHostAccessRuntimeParams()` (line 114) and
`stripZoteroHostAccessRuntimeOptionFromRequest()` (line 148).

---

## Orchestrator Coordination

In `src/modules/acpSkillRunnerOrchestrator.ts`, the orchestrator resolves the
zotero host access requirement from the incoming ACP request's
`runtime_options.zotero_host_access`:

```typescript
function resolveZoteroHostAccessRequirement(args) {
  const declaration = args.request.runtime_options?.zotero_host_access;
  if (declaration && typeof declaration === "object") {
    return {
      required: typeof declaration.required === "boolean"
        ? declaration.required : true,
      autoApproveWrites: declaration.auto_approve_writes === true,
      source: "request",
    };
  }
  return { required: true, autoApproveWrites: false, source: "default" };
}
```

### `required: true` Path

1. Call `materializeHostBridgeCliRunInjection()` to create the `.zotero-bridge/`
   directory structure in the run workspace.
2. Call `applyHostBridgeCliEnvToBackend()` to inject environment variables into
   the backend configuration.
3. Expose the `zotero-bridge-cli` wrapper skill through the shared skill catalog.

### `required: false` Path

1. Skip all injection — no `.zotero-bridge/` directory is created.
2. No Host Bridge environment variables are injected.
3. A `"zotero-host-access-disabled"` event is recorded for diagnostics.
4. The backend runs without Host Bridge CLI access.

---

## CLI Injection Materialization

`materializeHostBridgeCliRunInjection()` in
`src/modules/hostBridgeCliInjection.ts` (line 186) creates the following
directory structure in the run workspace:

```
<workspaceDir>/.zotero-bridge/
├── profile.json       # Host Bridge connection profile
├── README.md          # Runtime usage hints (agent-readable)
└── bin/
    ├── zotero-bridge       # POSIX shell shim
    └── zotero-bridge.cmd   # Windows cmd shim
```

### Profile JSON

```typescript
// schema: zotero-bridge.profile.v1
{
  schema: "zotero-bridge.profile.v1",
  protocol: "host-bridge.v1",
  endpoint: string,
  auth: { type: "bearer", tokenEnv: "ZOTERO_BRIDGE_TOKEN" },
  scope: {
    kind: "acp-chat" | "acp-skill-run",
    requestId: string,
    runId: string,
    autoApproveWrites?: true,     // present only when auto-approve is enabled
  },
}
```

### Environment Variable Injection

| Variable | Value | Notes |
|----------|-------|-------|
| `ZOTERO_BRIDGE_PROFILE` | Path to `.zotero-bridge/profile.json` | Always set |
| `ZOTERO_BRIDGE_TOKEN` | Bearer token | Set only when a token is available |
| `PATH` / `Path` | Prepend `.zotero-bridge/bin` directory | Deduplicated merge |

Variables are injected into the backend instance via
`applyHostBridgeCliEnvToBackend()` (line 315), with special PATH merging that
prepends the shim directory without duplicating existing path entries.

---

## Write Auto-Approval

Write auto-approval allows ACP agents to perform Zotero write operations
(item updates, note creation, etc.) without user permission popups.

### Flow

1. Workflow manifest declares `allowWriteApprovalBypass: true`.
2. User enables `autoApproveWrites` in the submit dialog or workflow settings.
3. `materializeHostBridgeCliRunInjection()` calls
   `registerHostBridgeWriteAutoApprovalScope()` when `autoApproveWrites` is
   `true` (`hostBridgeWriteAutoApprovalRegistry.ts:10`).
4. The profile.json scope gains `autoApproveWrites: true`.
5. When a permission check runs, `isHostBridgeWriteAutoApprovalScope()`
   (`hostBridgeWriteAutoApprovalRegistry.ts:24`) verifies:
   - `scope.kind === "acp-skill-run"`
   - `scope.autoApproveWrites === true`
   - The backend `hostBridgeCli.autoApproveWrites === true`
6. If all checks pass, the permission prompt is bypassed and the write
   operation executes directly.

---

## Full Data Flow

```
Workflow Manifest
  └─ zoteroHostAccess: { required, allowWriteApprovalBypass }
       ↓
buildZoteroHostAccessRuntimeOptions()
  └─ runtime_options.zotero_host_access = { required, auto_approve_writes? }
       ↓
acpSkillRunRequestAdapter → ACP Request
       ↓
acpSkillRunnerOrchestrator.resolveZoteroHostAccessRequirement()
       ↓
  ┌─ required=true? ──────────────────────────────┐
  │                                                │
  ├─ materializeHostBridgeCliRunInjection()        │
  │   ├─ .zotero-bridge/profile.json               │
  │   ├─ .zotero-bridge/README.md                  │
  │   ├─ .zotero-bridge/bin/zotero-bridge          │
  │   └─ .zotero-bridge/bin/zotero-bridge.cmd      │
  ├─ applyHostBridgeCliEnvToBackend()              │
  ├─ registerHostBridgeWriteAutoApprovalScope()    │
  │   [if autoApproveWrites]                        │
  └─ expose zotero-bridge-cli wrapper skill        │
       ↓                                           ↓
  Backend has Host Bridge access           Backend runs without
  + env + auto-approval (optional)          Host Bridge CLI
```

---

## Security Boundaries

| Rule | Rationale |
|------|-----------|
| Engine instruction files (CLAUDE.md, AGENTS.md) must not contain Host Bridge command snippets | The `zotero-bridge-cli` wrapper skill is the sole source of command guidance; duplicating it in instruction files creates a maintenance and audit hazard |
| Write auto-approval is double-gated (manifest + user confirmation) | Prevents workflows from silently enabling auto-approval without user consent |
| SkillRunner backends strip `zotero_host_access` runtime options | SkillRunner has its own built-in host access mechanism; passing ACP-specific options would be misleading |
| Token is passed through environment variable, not embedded in profile.json | Prevents accidental token leakage through file reads or logging |
