# Work Breakdown

Baseline: `9385eed6` (`dev`) plus uncommitted working-tree changes. Checked tasks
describe delivered work in that working tree. Checked verification tasks mean the
command was run and its outcome recorded in this session, not that every
environment-dependent check passed. Follow-ups that were not delivered remain
unchecked at the end.

## 1. Shared page-chrome layer

- [x] 1.1 Add `addon/content/shared/page-chrome.css` as the single source for cross-page control, text-scale, spacing and semantic badge tokens, plus the panel header, back entry, empty-state and scroll-ownership utilities; document the five-layer scroll model in the file header.
- [x] 1.2 Load the shared layer from both page documents (`addon/content/dashboard/index.html`, `addon/content/synthesis/index.html`) with a page-chrome UI revision.
- [x] 1.3 Replace the duplicated `--dashboard-control-*` and `--topic-control-*` palettes with aliases to the shared tokens, and token-ize status chips so dark theme applies instead of the hardcoded light hex.
- [x] 1.4 Remove the undefined `--accent-color` / `--border-color` references, the dead `.workbench-content-surface` rule and the redundant dark override block.
- [x] 1.5 Add the shared `zs-icon-arrow-back` icon to `addon/content/shared/icons.css`.
- [x] 1.6 Record the shared page-chrome and scroll-ownership rules in `AGENTS.md`.

## 2. Dashboard structure fixes

- [x] 2.1 Extend `ensureRegionMount` with a `before` insertion anchor so a newly created mount can be placed ahead of an existing sibling.
- [x] 2.2 Mount the Synthesis topbar title before `.topbar-controls`, restoring title-left / Sidecar-indicator-right order.
- [x] 2.3 Center the sidebar nav items when the Synthesis sidebar is collapsed (`justify-items: center` on `.synthesis-root.sidebar-collapsed .nav`).
- [x] 2.4 Split `TabBarRegion` into independent system and backend section containers instead of one list.
- [x] 2.5 Carry the sidebar group in the readonly harness Dashboard tabs (`src/modules/harness/dashboardReadonlyModel.ts`), fixing the Backends group header that sank below its tabs in the harness.

## 3. Secondary-view navigation

- [x] 3.1 Move the Dashboard workflow-document back entry into the panel header as the first element and remove the footer back action.
- [x] 3.2 Move the Topic Details and Artifact Reader back entries to the first position of the shared panel header with the `←` icon.
- [x] 3.3 Keep the originating Synthesis tab highlighted while the Reader is open, using the wire field already present (`reader.previousTab`) without changing the DTO.

## 4. Concepts alias bounding

- [x] 4.1 Bound concept alias chips to three visible entries plus a `+N` overflow chip whose tooltip lists every hidden alias.

## 5. Scroll ownership model

- [x] 5.1 Convert the Dashboard Home, workflow-options, synthesis-sidecar, acp-trace-replay, generic backend and migrations panels to the fill-column plus single `.zs-scroll-region` structure.
- [x] 5.2 Convert the Synthesis Home, Concepts and Tags surfaces; fix the Concepts grid row mismatch that clipped the table and the Tags sticky header that never pinned.
- [x] 5.3 Remove the fixed-height scrollers that wrapped primary content (Sidecar events `calc(100vh - 260px)`, migrations `min(56vh, 620px)` and `min(64vh, 700px)`) and flatten table wrappers inside a panel content region (`max-height: none; overflow: visible`) so the running-task table scrolls with the Home region instead of a 320 px box; leave panels that were already conforming (runtime logs, products, topics) unchanged.

## 6. Migrations panel

- [x] 6.1 Render the region through the shared panel header with version subtitle and right-flushed actions.
- [x] 6.2 Replace bare buttons and inputs with the shared button/text-input patterns, the native progress element with an accent progress bar including an indeterminate state, and summary pills with semantic badges.
- [x] 6.3 Give the candidate list the region's single scroll region with the pagination zone fixed at the bottom, and fix the missing panel-root overflow that clipped content.

## 7. Region update cost

- [x] 7.1 Add reference, null, string and boolean fast paths to `equalBySignature` that are exactly equivalent to the previous serialized comparison.
- [x] 7.2 Memoize the Dashboard panel projection on `(snapshot reference, selectedTabKey, sidecar filter/selection)` so unchanged snapshots resolve region comparisons by reference.
- [x] 7.3 Debounce the Sidecar trace filter by 150 ms through a component-local draft.
- [x] 7.4 Coalesce windowed-row scroll handling through `requestAnimationFrame` and read row keys through a latest-ref.
- [x] 7.5 Remove the Sigma zoom-slider listener on `destroy()`.

## 8. Tests and documentation

- [x] 8.1 Add `tests/dashboard/252-region-equality.test.ts` locking `equalBySignature` equivalence with `JSON.stringify` semantics: 23 input-pair cases compared against the legacy comparison in both directions, plus one reference short-circuit case (24 tests).
- [x] 8.2 Add `tests/dashboard/253-dashboard-panel-scroll-ownership.test.ts` covering sidebar group DOM order, Home scroll structure and the document back-entry position without asserting CSS values.
- [x] 8.3 Update the existing Dashboard chrome, Sidecar, Reader and migration UI tests for the new structures.
- [x] 8.4 Update `tsconfig.json`, `tsconfig.dashboard.json` and `tsconfig.synthesis.json` for the added shared sources.

## 9. Verification

- [x] 9.1 Run `npm run build` (including all `tsc --noEmit` project checks) and record the result: passed.
- [x] 9.2 Run `npm run test:node:dashboard` (13 files), `npm run test:node:synthesis` (3 shards) and `npm run test:node:ui` (16 files) and record the results: passed.
- [x] 9.3 Run prettier and eslint over the changed files and record the result: passed.
- [x] 9.4 Inspect the readonly harness in light and dark themes with Playwright screenshots and confirm the topbar order, collapsed-sidebar centering, Topic Detail back entry, Concepts/Tags/Home scroll behavior and dark-theme tokens.

## 10. Follow-ups

- [x] 10.1 Adopt or remove `src/shared/panelHeader.tsx`. Resolved by removal: the module was imported by nothing, and only one of the four header sites (MigrationsRegion) matched its fixed DOM shape while the other three use page-specific header containers, so the shared header contract stays with the `page-chrome.css` class pattern alone.
- [x] 10.2 Confirm the Migrations panel visually in a real Zotero profile; harness data cannot reach it behind the debug gate, so its behavior is covered by `tests/ui/264-*` only.
- [x] 10.3 Decide whether to converge the global `thead` / `tr:hover td` selectors. Decided: no convergence in this change; the risk of regressing unrelated tables outweighs the cosmetic gain and no concrete defect was observed (recorded in `design.md` Non-Goals).
- [x] 10.4 Align the scroll-ownership wording with the delivered structure: `page-chrome.css` header comment, `AGENTS.md` and both spec deltas now state one primary content scroll region per panel (Dashboard `.zs-scroll-region`; Synthesis surfaces use their own table wrappers) plus bounded secondary sub-panels (concept review panel 42%, tag import popover 45%), and the Dashboard `.table-wrap` 320 px cap applying only outside a panel region.

