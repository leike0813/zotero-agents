## Context

ACP Skills persists the submitted runtime selection on `AcpSkillRunRecord`, but later resolver work introduced writable per-run `current*` snapshots and precedence that lets live handshake defaults replace that selection. Initial execution, recovery, setters, UI projection, and final result projection consequently observe different state. Separately, the shared transcript renderer treats a received tail page as a replacement for older cached pages and schedules bottom-stick work that can outlive its owner or the user's follow-bottom intent.

The change must preserve the existing flat run-store JSON, shared Workspace contracts, transcript store/index format, cold mirror LRU, protocol-generic option classification, and Chat's live-session ownership model.

## Goals / Non-Goals

**Goals:**

- Make the four persisted ACP Skills run fields the sole run-effective selection.
- Make all other runtime-option state catalog-only, including observed defaults and `reasoningSource`.
- Reuse one transport applicator for initial and recovered sessions.
- Preserve model continuity through ordinary replies without reapplying it at each prompt boundary.
- Make shared virtual transcript reconciliation lossless across tail pages, older pages, terminal patches, spacer changes, owner changes, and stale animation frames.

**Non-Goals:**

- Migrating run persistence to a nested runtime-options object.
- Adding backend-, provider-, command-, or agent-family-specific behavior.
- Reapplying model settings before every reply.
- Changing transcript storage, pagination correctness ownership, cold mirror caching, or Workspace wire schemas.
- Publishing or releasing artifacts.

## Decisions

### Persisted run fields own ACP Skills current state

`acpModeId`, `acpModelId`, `acpRawModelId`, and `acpReasoningEffort` remain the persistence and UI source of truth. A small selection helper reads them and updates them atomically after a successful user edit. Backend cache and session state may contribute normalized choices, labels, reasoning provenance, and a real observed default only when a newly created run has no submitted value for that category.

This keeps recovery deterministic without a schema migration. A nested persisted selection was rejected because it would duplicate the existing fields and add migration code without resolving ownership.

### Catalog normalization is shared; current ownership is not

ACP Chat and ACP Skills reuse the same protocol-generic catalog and reasoning classification. Chat current values remain live-session owned; Skills current values remain run owned. Catalog normalization never invents a current value by selecting the first choice.

### Submission is normalized once and persisted before execution

Provider preparation and the common job entry reuse one pure submission normalization path. Explicit submitted IDs survive a missing cache; cache defaults only fill absent submitted categories. The created run is immediately persisted with the normalized selection, so no long-lived frozen closure or response JSON echo is needed.

### Initial and recovery transport share one applicator

The applicator always reads the latest run record and applies mode, model/raw-model, and explicit thought level according to `reasoningSource`. It bypasses public waiting-user edit guards because session initialization and recovery are lifecycle operations. Kilo's rejected `none` reasoning fallback remains centralized in this path. Ordinary replies only send their message.

### Virtual transcript state is reconciled by stable keys and ranges

Incoming pages replace only the same page or overlapping index range. Rows, inter-page gaps, edge spacers, and loading gaps receive stable keys and are reconciled in logical order. Before page merges, terminal patches, or measurement convergence, the renderer captures a row-or-gap anchor and restores its offset after commit. Bottom following is allowed only when the current owner/generation is still explicitly following the tail.

### Publication keeps a canonical live-tail base

The coordinator mutates one canonical live-tail state for steady deltas. On-demand page responses are cached/page-scoped views and cannot replace that mutation base. Loading and empty signatures include owner identity so an owner switch cannot reuse another owner's render state.

## Risks / Trade-offs

- **Risk: A backend reports a live default that differs from an old run with missing fields.** → Initialize only truly absent categories from an observed current value; never choose catalog entry zero.
- **Risk: Recovery applies an option no longer present in the new catalog.** → Preserve the run selection for display and use existing transport error handling; do not silently substitute a different model.
- **Risk: Anchor restoration conflicts with intentional tail following.** → Capture follow-bottom intent before mutation and gate scheduled work by owner, generation, and current scroll-away state.
- **Risk: Overlapping pages yield duplicate rows.** → Reconcile by stable item identity and logical index range, then assert page/row uniqueness in shared renderer tests.
- **Trade-off: Flat run fields remain less cohesive than a nested DTO.** → Avoiding migration and duplicate persistence is more valuable in this correction; selection helpers provide the cohesive API boundary.

