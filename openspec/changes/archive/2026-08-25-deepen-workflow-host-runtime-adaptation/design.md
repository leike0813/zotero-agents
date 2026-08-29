## Context

Workflow Host API v11 combines an explicit projection from the canonical Zotero
Host Capability Broker with trusted workflow-local capabilities. Its public
interface is stable, but several local capability implementations are embedded
in `hostApi.ts`. The runtime filesystem already has multiple production
adapters in `runtimePersistence`; archive behavior is already concentrated
behind `WorkflowArchiveApi`; and the picker module already owns toolkit picker
normalization.

The deepening must preserve plugin-runtime compatibility. Node modules may only
be reached through existing runtime adapters, never imported statically into
plugin paths.

## Goals / Non-Goals

**Goals:**

- Increase locality by assigning each workflow-local invariant one owner.
- Keep Workflow Host API v11 and every existing caller-facing method unchanged.
- Preserve strict Host file behavior without changing tolerant persistence
  callers.
- Test through the agreed module interfaces with internal local substitutes.
- Prevent partial stored-attachment imports on invalid or unreadable companions.

**Non-Goals:**

- Splitting or broadly redesigning `runtimePersistence`.
- Changing archive module shape, ZIP behavior, or tests.
- Tuning note-image dimensions, quality candidates, defaults, or hard caps.
- Changing Broker DTOs, Host Bridge/MCP locality, permissions, or transports.
- Adding a runtime catalog, proxy, umbrella facade, or new public host members.

## Decisions

### Existing filesystem owner, distinct failure semantics

`runtimePersistence` remains the sole module that selects IOUtils, OS.File,
Zotero.File, and Node filesystem adapters. Shared internal operations will back
both tolerant persistence helpers and strict workflow-facing helpers. Strict
operations reject invalid paths, missing inputs, and unavailable adapters;
existing tolerant reads continue returning their documented empty result.

Workflow Host file members normalize workflow-local paths and explicitly bind
the applicable strict or total operation. The filesystem adapters remain
late-bound per invocation.

### Workflow Input Materialization owns managed provider inputs

A one-operation Workflow Input Materialization module owns payload exclusivity,
safe workflow/key/file-name segments, reserved names, unique names, and the
managed `runtime/tmp/workflow-inputs` location. It delegates bytes and text
writes to strict runtime filesystem operations.

### Picker module owns every picker adapter

The shared picker module owns parent-window selection, input normalization,
native multi-file selection, toolkit fallback, and cancellation normalization.
The workflow projection delegates all modes to the same interface. Parent and
runtime objects are resolved for every call so cached host projections cannot
retain stale windows.

### Note-image preparation is a workflow-local pipeline

A Workflow Note Image Preparation module owns source normalization, file-to-Blob
loading, decoding, bounded sizing, canvas drawing, encoding, quality selection,
hard-cap enforcement, and cleanup. Its public interface remains
`prepareForNoteEmbedding`; runtime decoder/encoder choices are internal seams.
`notes.importEmbeddedImage` remains a separate Zotero mutation.

### Stored attachment import owns companion invariants

A Workflow Stored Attachment Import module composes the generic attachment
handler with runtime filesystem operations. It validates every companion path
before mutation and stages every companion under managed runtime tmp so source
readability is proved before creating a Zotero attachment. After import it copies
the staged snapshot into the attachment storage directory. Any later failure
removes the new attachment on a best-effort basis, cleans staging, and preserves
the primary failure with cleanup diagnostics.

### Explicit composition, no umbrella facade

`createWorkflowHostApi()` binds each module through explicit object members.
Internal adapters do not appear in `WorkflowHostApi`, and the existing archive
module remains independent. Deleting any new workflow module would move its
policy back into the composition root; a wrapper that merely forwarded all
modules would fail that deletion test and is not introduced.

## Risks / Trade-offs

- Strict and tolerant file operations can drift -> share internal adapter
  selection and test both outcomes at their interfaces.
- Picker tests could open real Zotero UI -> keep them node-only with runtime
  substitutes and preserve the existing Zotero skip.
- Canvas behavior differs by runtime -> test observable preparation behavior
  through deterministic internal adapters, not exact Canvas calls.
- Companion rollback can itself fail -> retain the primary failure and attach
  cleanup diagnostics; do not claim cross-database/filesystem atomicity.
- Moving code can accidentally widen Workflow Host API -> preserve existing
  types/version and explicit member conformance tests.

## Migration Plan

1. Add failing strict/tolerant filesystem and Host file behavior tests.
2. Implement shared strict filesystem operations and extract Workflow Input
   Materialization.
3. Move native multi-file behavior into the picker module after a failing
   module-interface test.
4. Add failing note-image preparation behavior tests and extract the pipeline.
5. Add failing stored-attachment import tests and implement staging/rollback.
6. Remove migrated implementations from `hostApi.ts`, update constraints and
   SSOT documentation, then run the complete validation gates.

Rollback is file-level reversal of this uncommitted change. No persisted schema
or release identity changes.
