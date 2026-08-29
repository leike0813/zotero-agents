## Why

Production TypeScript still selects filesystem, runtime-global, Window, and picker adapters in multiple callers. Those duplicated selectors weaken per-call late binding and make Zotero 7/9 behavior difficult to govern through stable module interfaces.

The fixed implementation baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`; this change depends on `01-establish-workflow-host-v12-contract-foundation`.

Architecture source: [`artifact/workflow-host-v12-architecture-decisions.md`](../../../artifact/workflow-host-v12-architecture-decisions.md), especially §§4.5, 13, 14.8, 18, and 19. The architecture record is authoritative for the closed native-workload exceptions, per-call late binding, owner boundaries, and required validation evidence summarized here.

## What Changes

- Make `runtimePersistence` the sole owner of production ordinary asynchronous filesystem adapter selection, including strict and tolerant operations, atomic operations, Unicode-safe append, and temporary-path resolution.
- Converge runtime/global/Window candidate resolution in `runtimeBridge` and picker-specific parent, adapter, filter, cancel, and empty-result policy in `filePicker`.
- Resolve runtime-sensitive candidates and adapters on every call; never dispatch on Zotero version strings.
- Migrate workflow loader, bundler, runtime, installer, transfer, profile, provider, and related ordinary-I/O callers to the owner seam.
- Preserve only the closed native-workload exceptions defined by the architecture record; keep them owner-private and testable.
- Remove the approved shallow filesystem selector exports and caller-local equivalents without deleting `runtimeCompatibility` itself.
- Keep the active Workflow Host public shape unchanged; this slice prepares internal owners for v12.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `runtime-persistence-governance`: Extend the filesystem owner to all production ordinary async I/O and require strict/tolerant, atomic, Unicode, unavailable, and per-call late-binding behavior.
- `runtime-global-bridge-consolidation`: Separate current runtime/global/Window candidate resolution from picker policy and prohibit version-string dispatch.
- `runtime-platform-services`: Require platform-sensitive callers to consume the owned runtime seams instead of local adapter selectors.
- `workflow-input-file-materialization`: Require managed input materialization to use the centralized strict filesystem interface.
- `workflow-execution-seams`: Govern production callers and the closed native-workload allowlist.

## Impact

- Owners: `src/modules/runtimePersistence.ts`, `src/utils/runtimeBridge.ts`, `src/platform/filePicker.ts`, and `src/utils/runtimeCompatibility.ts`.
- Caller families: workflow loading/planning/bundling, runtime execution, built-in sync, SkillRunner runtime/install, file transfer, Host Bridge profile storage, generic HTTP and SkillRunner providers, ACP context, selection, and note-image preparation.
- Tests: runtime persistence governance, runtime bridge, picker, note-image, stored attachment, archive, platform services, and Zotero compatibility.
- No new public Workflow Host member, persisted schema, dependency, release, or generated help-doc change.
