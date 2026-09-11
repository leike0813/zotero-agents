# Unify Dashboard and Synthesis Workbench Page Chrome

## Why

Dashboard and Synthesis Workbench each kept a private copy of the same control
tokens, status-chip colors, panel header and scroll rules, so the two pages
drifted visually and structurally: panels clipped content inside nested
`max-height` scrollers, sticky table headers sat in non-scrolling parents, back
navigation changed position per view, and status chips silently lost their dark
theme. Region comparison also fell back to `JSON.stringify` for every snapshot
comparison, so high-frequency trace and log updates could not be dismissed
cheaply.

## What Changes

- Add `addon/content/shared/page-chrome.css` as the single cross-page source for
  control/text/spacing tokens and the shared panel header, back entry, empty and
  badge patterns, and load it from both page documents.
- Define one panel header shape on both pages as a shared style pattern: an
  optional back entry first, then title/subtitle, then right-flushed actions.
- Replace the duplicate `--dashboard-control-*` / `--topic-control-*` palettes
  with aliases to the shared tokens; token-ize hardcoded status chips so the
  dark theme applies; drop the dead `.workbench-content-surface` rule and the
  redundant dark override block.
- Adopt the five-layer scroll ownership model on both pages: page root and
  `.main` never scroll, every panel is a fill column with fixed
  header/toolbar/filter/pagination zones and one primary content scroll region
  (bounded secondary sub-panels such as the concept review panel and the tag
  import popover keep their own bounded scrolling), and sticky headers live
  inside the scroll container that actually scrolls.
- Fix the Dashboard topbar order (title before controls) and center the
  Synthesis sidebar nav when the sidebar is collapsed.
- Route Topic Details, Artifact Reader and the Dashboard workflow doc subview
  back entries through the shared header back slot, keeping the originating
  Synthesis tab highlighted while the Reader is open.
- Bound Concepts alias chips to three visible entries plus `+N`.
- Short-circuit region comparison: reference/null/string/boolean fast paths in
  `equalBySignature`, memoized Dashboard panel projection, a debounced Sidecar
  trace filter, rAF-coalesced windowed-row scrolling, and Sigma slider listener
  removal on destroy.
- Carry Dashboard tab group placement in the readonly harness snapshot so the
  harness sidebar groups match production.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-runtime-ui`: shared page-chrome tokens and patterns, panel scroll
  ownership, secondary-view back entry, and migration panel structure.
- `synthesis-workbench-ui`: shared page-chrome tokens and patterns, surface
  scroll ownership, Reader back navigation, and bounded alias chips.
- `plugin-ui-rendering-stability`: unchanged-signature updates short-circuit
  without recomputing signatures or rebuilding unrelated regions.
- `ui-readonly-harness`: Dashboard harness snapshots carry tab group placement.

## Impact

- Touches the two page stylesheets and HTML skeletons, `src/dashboard`,
  `src/synthesis`, `src/shared`, the readonly harness model, the Dashboard and
  Synthesis tsconfig entries, and Dashboard/UI tests.
- Adds `addon/content/shared/page-chrome.css`,
  `tests/dashboard/252-region-equality.test.ts` and
  `tests/dashboard/253-dashboard-panel-scroll-ownership.test.ts`.
- Host actions, snapshots, messages, DTOs, business behavior and native code are
  unchanged; the scroll-ownership and shared-token rules are recorded in
  `AGENTS.md`.
