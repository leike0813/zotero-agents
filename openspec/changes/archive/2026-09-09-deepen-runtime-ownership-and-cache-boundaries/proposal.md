## Why

Several runtime-facing modules duplicated ownership across persistence, projection, and UI layers. This allowed stale SkillRunner task state, made Preferences window teardown unsafe, coupled Workflow Host validation to the runtime log store, and let Literature Artifact migration classification/version facts drift between callers.

## What Changes

- Make the SkillRunner Run Store the only lifecycle source for SkillRunner task projections; Task Runtime combines current projections for reads without hydrating or caching a second copy.
- Give each Preferences local-runtime binding one window-scoped owner with idempotent cleanup and stale-effect suppression.
- Move Workflow logging validation, trusted identity binding, and sanitization into the Workflow owner while leaving normalized storage, retention, and observation in the runtime log pipeline.
- Route Dashboard migration and offline import through one Literature Artifact converter and project the current migration ID/version from the migration owner.
- Remove superseded merge helpers, forwarding seams, duplicate converter logic, and unused migration adapter types.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-runtime-ui`: Require SkillRunner task visibility and active state to derive directly from the Run Store without a Task Runtime lifecycle cache.
- `skillrunner-local-runtime-ui-adjustments`: Define one-window ownership and disposal behavior for the Preferences local-runtime binding.
- `runtime-log-pipeline`: Clarify the boundary between Workflow-owned validation/binding and the normalized runtime log core.
- `literature-artifact-migration`: Require one converter result across migration/import paths and exact current definition-version projection in Dashboard.

## Impact

- Affected runtime code: `src/modules/taskRuntime.ts`, SkillRunner foreground continuation, Preferences binding, Workflow logging owner, runtime log manager, Literature Artifact migration, and Dashboard migration projection.
- Affected tests: task/run-store separation, task runtime, refresh governance, Preferences UI lifecycle, runtime logging, migration core/UI, and workflow literature import/export.
- No public wire DTO, persisted run-store format, migration receipt format, dependency, or external API changes.
