## Why

The upcoming architecture refactor depends on backend selection, workflow execution, settings persistence, and runtime diagnostics carrying stable structured data. Several core boundaries currently accept broad strings or `unknown` maps, so spelling drift or shape drift can survive compilation and fail only through scattered runtime conventions.

This change hardens those data contracts before the larger refactor, while keeping behavior-compatible persistence and provider execution semantics.

## What Changes

- Constrain backend instance types to the supported provider families: `skillrunner`, `acp`, `generic-http`, and `pass-through`.
- Reject unknown backend types during backend registry normalization instead of allowing them into provider/backend matching.
- Introduce a typed `JobRecord` metadata contract for stable workflow, backend, provider, request, run, sequence, and SkillRunner lifecycle fields.
- Keep workflow-specific job metadata extensible, but make the core runtime fields compile-time visible.
- Version and centralize `workflowSettingsJson` document parsing/writing while preserving reads of the existing unversioned record shape.
- Remove duplicate workflow settings patch parsing by routing settings normalization through the domain contract.
- Confirm the runtime log pipeline's file-persistence-first behavior and keep `runtimeLogsJson` as a legacy migration/fallback path rather than primary storage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `provider-adapter`: Backend/provider dispatch must only operate on known backend type values.
- `workflow-execution-runtime`: Job metadata used across queue, runtime, task projection, and reconciliation must expose a stable typed core.
- `workflow-settings-domain-decoupling`: Workflow settings persistence must have a versioned document contract and a single normalization path.
- `runtime-log-pipeline`: Runtime logs must preserve file-persistence-first semantics and avoid treating prefs as the primary log store.
- `runtime-persistence-governance`: Runtime persistence governance must document that runtime log files are the durable log location after migration.

## Impact

- Affected code: backend type definitions/registry normalization, provider dispatch constants, job queue metadata typing, workflow settings domain parsing/writing, runtime log persistence tests.
- Affected persisted data: existing backend configs remain valid only if their `type` is one of the supported values; existing workflow settings remain readable and are rewritten into the versioned form on normal save/remap paths.
- Dependencies: no new runtime dependency; use existing TypeScript types, constants, and current runtime persistence utilities.
- Compatibility: no Git history change, no development server requirement, and no intentional UI behavior change.
