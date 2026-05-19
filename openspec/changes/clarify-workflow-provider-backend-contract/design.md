## Overview

The workflow manifest contract is split into three concepts:

- `provider`: execution provider and backend compatibility source.
- `request.kind`: provider-facing request protocol/shape.
- backend profile: concrete configured runtime target.

This change removes the ambiguous `execution.supportedBackends` layer and stops using `request.kind` to infer compatible backend types.

## Contract

### Provider-Derived Backend Compatibility

Runtime backend compatibility SHALL be derived from `workflow.provider` only:

| provider | compatible backend types |
| --- | --- |
| `acp` | `acp` |
| `skillrunner` | `skillrunner`, `acp` |
| any other provider | same as provider |

The `skillrunner -> skillrunner/acp` rule is a current local compatibility bridge: ACP can execute SkillRunner-shaped skill runs through the ACP skill runner path. This rule is intentionally temporary; if remote MCP support later makes SkillRunner backend capable of host MCP access, a future change can revise provider compatibility without reintroducing `request.kind` inference.

### Request Kind

`request.kind` describes request shape only. For example, `skillrunner.job.v1` means the workflow builds a SkillRunner job request. It does not imply that SkillRunner backend profiles are compatible.

Examples:

```json
{
  "provider": "acp",
  "request": { "kind": "skillrunner.job.v1" }
}
```

This workflow uses SkillRunner job shape but only ACP backend profiles are compatible.

```json
{
  "provider": "skillrunner",
  "request": { "kind": "skillrunner.job.v1" }
}
```

This workflow can use SkillRunner backend profiles and ACP backend profiles.

## Runtime Changes

- `resolveCompatibleBackendTypesForWorkflow()` will be rewritten to read only `workflow.manifest.provider`.
- `execution.supportedBackends` will be ignored after removal from schema and built-ins.
- Missing `provider` will produce a deterministic error instead of falling back to `request.kind`.
- `buildWorkflowSettingsUiDescriptor()` and `resolveWorkflowExecutionContext()` will naturally inherit this through `listBackendsForWorkflow()` / `resolveBackendForWorkflow()`.
- Dashboard quick-run enabled state should remain based on selection/configuration requirements, but any backend/profile availability check must use provider-derived backend compatibility.

## Manifest Schema

- `WorkflowExecutionSpec.supportedBackends` is removed.
- `src/schemas/workflow.schema.json` stops allowing `execution.supportedBackends`.
- The schema continues to require or validate top-level `provider` as the execution provider for workflow manifests.
- Built-in workflow JSON files remove `execution.supportedBackends`.

## Migration

Built-in workflows currently declaring `execution.supportedBackends` remove the field. Behavior after migration:

- ACP-only synthesis and literature ingest workflows keep `provider: "acp"` and therefore only list ACP backend profiles.
- Traditional SkillRunner workflows keep `provider: "skillrunner"` and list both SkillRunner and ACP backend profiles.
- Generic HTTP workflows keep `provider: "generic-http"` and list only generic HTTP backend profiles.

This is a breaking manifest contract for user workflows that relied on `execution.supportedBackends`. Validation diagnostics should point authors to `provider` as the compatibility source.

## Non-Goals

- Do not change `request.kind` values or request payload shape.
- Do not change ACP skill runner execution internals.
- Do not add remote MCP support.
- Do not add a replacement field such as `backendTypes`.
