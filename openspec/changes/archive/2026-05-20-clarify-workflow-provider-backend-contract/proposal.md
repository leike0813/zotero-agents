## Why

Workflow manifests currently expose both top-level `provider` and `execution.supportedBackends`, while runtime code also infers backend compatibility from `request.kind`. This makes ACP/SkillRunner-compatible workflows difficult to reason about: `request.kind` describes request shape, but it is being treated as a backend compatibility signal.

This change clarifies the contract before more ACP-only and SkillRunner-compatible workflows are added, so settings UI, dashboard quick-run, menu triggers, and execution resolution all agree on one backend selection rule.

## What Changes

- **BREAKING** Remove `execution.supportedBackends` from workflow authoring and runtime semantics.
- Treat top-level `provider` as the only manifest source for backend compatibility.
- Treat `request.kind` only as request protocol/shape; it MUST NOT infer compatible backend types.
- Define temporary ACP/SkillRunner compatibility mapping:
  - `provider: "acp"` resolves only ACP backend profiles.
  - `provider: "skillrunner"` resolves SkillRunner and ACP backend profiles.
  - Other providers resolve only backend profiles with matching backend type.
- Require workflow manifests to declare `provider`; missing provider is an invalid or non-executable manifest state.
- Update built-in workflow manifests and docs to remove `execution.supportedBackends`.
- Update settings/profile filtering, workflow execution context resolution, dashboard shortcuts, and menu preflight tests to use provider-derived backend compatibility.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-contract`: Replace `execution.supportedBackends` backend compatibility semantics with provider-derived backend compatibility.
- `workflow-manifest-authoring-schema`: Remove `execution.supportedBackends` from the manifest schema contract and clarify that `provider` is required for executable workflows.
- `workflow-settings-single-source-submit-flow`: Ensure settings gates and persistent workflow options list only provider-compatible backend profiles.
- `acp-skillrunner-compatible-runner`: Clarify that ACP execution of SkillRunner-shaped jobs is provider-mediated and does not make `request.kind` a backend compatibility source.

## Impact

- Code:
  - `src/backends/registry.ts`
  - `src/modules/workflowSettings.ts`
  - `src/modules/workflowExecute.ts`
  - `src/modules/workflowMenu.ts`
  - `src/modules/taskManagerDialog.ts`
  - `src/workflows/types.ts`
  - `src/schemas/workflow.schema.json`
- Built-in workflow manifests under `workflows_builtin/**/workflow.json`.
- Tests for backend resolution, workflow settings/profile filtering, manifest schema validation, and built-in workflow contracts.
- Documentation describing workflow manifest authoring and provider/backend/request-kind semantics.
