## 1. Spec and Schema

- [x] Update `src/workflows/types.ts` to remove `WorkflowExecutionSpec.supportedBackends`.
- [x] Update `src/schemas/workflow.schema.json` to reject `execution.supportedBackends`.
- [x] Update docs that describe workflow manifest provider/backend/request-kind semantics.

## 2. Backend Compatibility Resolution

- [x] Change backend compatibility resolution to derive backend types only from `workflow.manifest.provider`.
- [x] Implement provider mapping:
  - `acp` -> `["acp"]`
  - `skillrunner` -> `["skillrunner", "acp"]`
  - other providers -> `[provider]`
- [x] Ensure missing provider produces deterministic manifest/runtime diagnostics instead of request-kind fallback.
- [x] Ensure `request.kind` no longer contributes compatible backend types.

## 3. Built-in Workflow Manifests

- [x] Remove `execution.supportedBackends` from all built-in workflow manifests.
- [x] Verify ACP-only workflows keep `provider: "acp"`.
- [x] Verify SkillRunner-compatible non-MCP workflows keep `provider: "skillrunner"` when both SkillRunner and ACP backends should be available.

## 4. Settings and Trigger Behavior

- [x] Ensure workflow settings/profile dropdowns only show provider-compatible backends.
- [x] Ensure execution context resolution rejects persisted backend IDs incompatible with provider-derived compatibility.
- [x] Ensure workflow menu preflight uses provider-derived backend compatibility.
- [x] Ensure Dashboard workflow quick-run state and submit path use the same compatibility behavior.

## 5. Tests

- [x] Add or update tests for ACP provider + `skillrunner.job.v1` showing only ACP backends.
- [x] Add or update tests for SkillRunner provider + `skillrunner.job.v1` showing SkillRunner and ACP backends.
- [x] Add or update tests proving `request.kind` alone does not infer backend compatibility.
- [x] Add or update schema tests rejecting `execution.supportedBackends`.
- [x] Add or update built-in workflow contract tests ensuring no built-in manifest declares `execution.supportedBackends`.

## 6. Verification

- [ ] `npm run test:node:core -- --grep "workflow"`
- [x] `npm run build`
- [x] `openspec validate clarify-workflow-provider-backend-contract --strict`
