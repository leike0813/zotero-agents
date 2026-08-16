## Why

`acpSkillRunStore` still exposes 44 runtime entry points and mixes record
persistence, controller registry, permission queues, runtime catalog, and
conversation actions in one module.

## What Changes

- Split the store into six focused modules with host-callback dependencies.
- Keep the record core, transcript projection, and reset orchestration in the
  store.
- Migrate callers to import the focused modules directly.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-skill-run-file-backed-runtime-state`: store core and host boundaries.
- `acp-skills-interactive-execution`: controller, permission, runtime, action,
  and selection module responsibilities.

## Impact

- Adds six modules under `src/modules/`.
- Removes moved exports from `acpSkillRunStore`.
- Updates callers and tests to direct imports.
- No persisted record schema change.
