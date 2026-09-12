## Why

The 2026-09-12 code review and a follow-up UI audit found that `addon/content/components/` still shipped hand-written vendor widgets alongside the Preact pages: `custom-progress.{js,css}` was unreferenced dead code (preferences uses an inline copy), and `custom-select.js` was consumed through `window.*` globals and vendor islands with three open defects (F1 cross-instance close state, F2 label-based value lookup, F3 multi-select array aliasing) plus a diverged CSS fork in `workflow-settings-dialog.css` (F10). A native `<select>` in the Backend Manager dialog also contradicted the documented popup-surface caveat.

## What Changes

- Replace `addon/content/components/custom-select.js` with controlled Preact components `CustomSelect` / `CustomMultiSelect` in `src/shared/customSelect.tsx`, preserving the `.custom-select*` DOM class contract, the 200px open-up heuristic, keyboard parity, and multi-select apply-on-close semantics.
- Delete the dead `custom-progress.js` / `custom-progress.css`; the inline copy in `preferences.xhtml` remains the live source.
- Migrate `WorkflowOptionsRegion`, `RuntimeLogsRegion`, and `BackendManagerRegion` off `window.*` vendor globals; the Backend Manager auth dropdown moves from a native `<select>` to `CustomSelect`.
- Converge the diverged dialog CSS fork back into the shared `custom-select.css` as the single source (dialog-visual values win).
- Remove the vendor `<script>` tags from the three dashboard HTML pages and rewrite `docs/components/ui-render-caveats.md` (path drift corrected, native-select ban narrowed to openDialog + non-remote iframe surfaces, usage guidance updated to the Preact component).
- Update dashboard tests 242/245/250 to drive the real component and add `tests/shared/customSelect.test.ts` covering the F1/F2/F3 regressions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a behavior-preserving refactor with no spec-level requirement changes, so the change opts out of spec deltas via `skip_specs: true`.

## Impact

Affected: `src/shared/customSelect.tsx` (new), three dashboard region components, `addon/content/components/` (vendor files removed, shared CSS kept), `workflow-settings-dialog.css`, three dashboard HTML pages, dashboard tests 242/245/250, new shared test, `scripts/run-node-test-shards.ts` (new `shared` shard), and `docs/components/ui-render-caveats.md`. No new dependencies. Minor visual change accepted: dashboard inline-form dropdowns adopt the dialog fork's 8px radius and 28px min-height. Manual verification in a real Zotero client remains required for the three popup surfaces.
