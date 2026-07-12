## Context

The builtin literature workbench package owns workflow business logic, while the Synthesis service owns local Index data and persistence. Package hooks may import only files inside their package root, so a shared tag checker must live in the package and be consumed by the host through a typed adapter.

## Goals / Non-Goals

**Goals:**

- Keep one tag-compliance algorithm for manual auditing and automatic Index entry auditing.
- Persist an Index audit ledger without adding machine-state tags to Zotero items.
- Run existing literature workflows from a specific Index row without duplicating dispatch code.

**Non-Goals:**

- Re-auditing every existing row on every Index render.
- Synchronizing audit state, changing the controlled vocabulary, or adding bulk Index actions.

## Decisions

### Package-owned pure checker

`literature-workbench-package/lib/tagCompliance.mjs` will export a pure checker that receives tag strings and active controlled tags. Both the new workflow hook and a typed Synthesis adapter use this module. This keeps workflow code importable by the package hook bundler while preserving a single implementation.

### Local audit ledger

The Synthesis repository will store a row for every audited `(libraryId, itemKey)`, including compliant rows. A manual auditor run replaces the current-library snapshot; automatic Index auditing only inserts rows absent from the ledger. Tag Regulator success changes the row to compliant instead of deleting it, so Index reads do not immediately repeat the first-entry audit.

### Index-bound automatic audit

The Index surface builder will ensure audit records for its current Zotero-backed rows before UI projection, then join `needsTagRegulation` and item identity into the DTO. Sidecar-only and external rows are not auditable. The audit result is returned in the same surface payload; state changes also invalidate only the Index surface.

### One row-workflow command

The UI sends a single host command containing item identity and a restricted workflow id. The host selects that item in the Zotero pane, resolves the loaded workflow, and uses the existing settings-gated execution entry point. This exactly follows menu execution semantics without maintaining separate Analyze and Regulate implementations.

## Risks / Trade-offs

- [Index reads can write first-entry audit records] → Restrict writes to rows absent from the ledger and reuse the current page's already-loaded item metadata.
- [Vocabulary or tag edits can stale an existing ledger record] → The manual tag-auditor remains the explicit full-library reconciliation mechanism.
- [Tag Regulator can finish without a usable result] → Clear the marker only after a valid, non-skipped result application.

## Migration Plan

Create the audit table using the repository's idempotent schema initialization. Existing libraries have no ledger rows, so their visible Index entries are audited lazily as they first enter the Index. Removing the feature leaves the local table unused and does not alter Zotero data.
