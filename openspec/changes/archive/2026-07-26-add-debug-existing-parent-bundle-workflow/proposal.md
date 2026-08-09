## Why

The debug apply-contract suite can verify bundle application only by creating a synthetic parent item before execution. It needs an existing-parent variant that exercises real Input Planning units and proves queued ACP or SkillRunner results attach to the parent selected for each unit.

## What Changes

- Add a debug-only `debug-apply-existing-parent-bundle` workflow.
- Accept one or more existing parent items and execute one bundle-producing unit per parent.
- Reuse `debug-apply-bundle-probe` and attach its declared artifact to the corresponding existing parent.
- Fail without creating a replacement item when the selected parent is missing or invalid.
- Cover multi-parent target isolation through both SkillRunner and ACP-compatible bundle application.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-execution-seams`: Define an existing-parent bundle probe that preserves each prepared unit's target through build, provider execution, and apply.

## Impact

- Extends the builtin workflow debug-probe package, package manifests, and debug documentation.
- Reuses the existing debug bundle skill and shared apply-contract implementation.
- Adds focused workflow contract and provider-integration tests without changing public workflow APIs or production workflow behavior.
