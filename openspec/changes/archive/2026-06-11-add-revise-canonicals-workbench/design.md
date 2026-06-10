# Design

## Index Functional Subview

Revise Canonicals is entered from the Index toolbar via `Revise Canonicals` and returns with `Back to Index`. It uses local workbench state (`activeIndexTool`) so normal Index search/filter/review state survives switching.

## Canonical Read Model

The registry surface includes `canonicalRows` and `canonicalDiagnostics`. Rows project effective canonical references rather than physical rows: bound canonicals collapse by Zotero binding target, unbound external canonicals collapse by effective canonical id. Each row carries human-readable title/year/authors/identifiers, binding state, raw-reference counts, graph state, redirect summaries, related review/proposal counts, duplicate diagnostics, and action availability.

## Details and Edit Drawer

Selecting a row opens the Canonical Details drawer. The drawer has Overview, Redirects, and Reviews sections and can collapse. Edit mode reuses the same drawer: the left side edits safe metadata fields, while the right side compares incoming redirect source canonical metadata and can copy values into the draft. Dirty drafts stay in local UI memory until saved or reverted.

## Merge Workflow

Revise Canonicals does not immediately write on row merge selection. Single merge marks one row as source and converts other row merge controls into target controls. Batch merge uses checkboxes plus `Merge Selected` to create multiple source rows. Choosing a target queues pending merge requests; pending source rows are hidden to prevent conflicting requests. `Apply pending` submits the batch as canonical revision merge requests that create accepted canonical revision merge proposals and redirects after service validation.

## Boundaries

Service validators reject self/cycle merges, unsafe binding conflicts, and protected archive/edit operations. Bound Zotero rows cannot be metadata-edited. Canonicals already managed by Canonical Revision Review are shown with diagnostics rather than a second review action. Harness handles all write commands as readonly mock actions with `db-write` reason.
