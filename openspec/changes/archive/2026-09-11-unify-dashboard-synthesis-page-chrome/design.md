## Context

See `proposal.md` - Why. Before this change the two page stylesheets each owned
a private control palette (`--dashboard-control-*`, `--topic-control-*`), a
private badge palette (hardcoded light-theme hex in the status chips), and a
private panel-header shape; the Dashboard topbar rendered its title after the
Sidecar controls; panels wrapped their primary content in their own
fixed-height scroll boxes (a 320 px table wrap, `calc(100vh - 260px)` Sidecar
events, `min(56vh, 620px)` migrations) that clipped content; a sticky Tags
header sat in a parent that never scrolled; and `equalBySignature` serialized
every region selection on every snapshot comparison.

Both pages already share `src/shared/regionEquality.ts`,
`src/shared/preactRegionMount.ts` and `addon/content/shared/theme.css`, so a
shared chrome layer is an extension of an existing seam rather than a new one.

## Goals / Non-Goals

**Goals:** one token and pattern source for both pages, one scroll-ownership
model both pages follow, consistent secondary-view navigation, bounded Concepts
alias rendering, and cheap dismissal of unchanged region updates.

**Non-Goals:** renaming page-specific CSS classes or reorganizing the two
stylesheets, restyling the panels already conforming to the scroll model
(runtime logs, products, topics), changing wire contracts, host actions or
business behavior, and adding a panel-level title to each Synthesis surface
(the topbar already names the active surface). A global `thead`/`tr:hover td`
selector convergence was evaluated and deliberately dropped: the risk of
regressing unrelated tables outweighs the cosmetic gain, and no concrete defect
was observed.

## Decisions

- **Token ownership: shared definitions plus page-private aliases.** The shared
  layer defines `--zs-control-*`, `--zs-text-*`, `--zs-space-*` and
  `--zs-badge-*`; each page keeps its existing `--dashboard-control-*` /
  `--topic-control-*` names as one-line `var(--zs-*)` aliases. Renaming every
  call site would have produced a large, purely mechanical diff and made the
  change unreviewable at the places that matter. Cost: two names for one value,
  disclosed in the `page-chrome.css` header comment.
- **Chrome patterns are CSS contracts, not a component library.** `zs-panel-header`,
  `zs-back-link`, `zs-empty` and `zs-badge` are class-based so both the
  Preact regions and the remaining imperative renderers can adopt them. The
  speculative shared Preact `PanelHeader` component (`src/shared/panelHeader.tsx`)
  was removed after review: only one of the four header sites matched its fixed
  DOM shape (the other three use page-specific header containers), so the
  component added a second contract without adoption.
- **Scroll ownership is a five-layer contract.** L0 page root never scrolls
  (`overflow: hidden`), L1 chrome scrolls only inside the sidebar nav, L2 panel
  root is a fill column with `min-height: 0`, L3 one primary content scroll
  region per panel owns primary-content scrolling, L4 bounded secondary areas
  (the concept review panel at 42% of the surface height, the tag import
  popover at 45%, drawer/popover/dialog bodies, the Sigma canvas) keep their
  own scrolling but never carry primary content. Panels that nested a
  fixed-height scroller around their primary content were flattened onto the
  panel content region instead of tuning the nested box, because two competing
  scroll regions are the root cause of the clipping. A table wrapper that *is*
  the panel's content scroll container (runtime logs, audit, Sidecar events,
  task tables) keeps its own bounded height; inside a panel content region the
  wrapper is flattened so the sticky header pins to the region. Dashboard
  panels use the shared `.zs-scroll-region` / `.zs-fill-col` utilities;
  Synthesis surfaces keep their existing wrappers (`.concept-table-wrap`,
  `.tags-table-wrap`) acting as the region under the same model.
- **Back entries live in the panel header, first position.** Secondary views
  (workflow document, Topic Details, Artifact Reader) render the shared
  `zs-back-link` as the first element instead of a footer action. The Reader
  keeps its originating tab highlighted from the wire field already present
  (`reader.previousTab`), so no DTO change was needed.
- **Region equality keeps `JSON.stringify` semantics, minus the cost.**
  `equalBySignature` adds reference, null, string and boolean fast paths that
  are exactly equivalent to the previous serialized comparison; numbers
  deliberately still fall through so `NaN`/`Infinity` keep their `"null"`
  serialization behavior. `tests/dashboard/252-region-equality.test.ts` locks
  equivalence across 24 cases.
- **Memoize the projection instead of weakening region signatures.** The
  Dashboard projection is memoized on `(snapshot reference, selectedTabKey,
  sidecar filter/selection)`, so an unchanged snapshot makes every region
  comparison resolve by reference. Alternative considered: shorten the
  signatures — rejected because it would silently drop rendered fields.
- **Coalesce high-frequency input at the point of entry.** The Sidecar trace
  filter keeps a component-local draft and debounces the committed filter by
  150 ms; windowed-row scrolling coalesces through `requestAnimationFrame` and
  reads row keys through a latest-ref. This keeps the projection count
  proportional to settled input rather than raw events.
- **Harness parity is data parity, not renderer forks.** The Dashboard readonly
  harness snapshot now carries the sidebar group for every tab; the reused
  production renderer then groups correctly. No harness-only renderer branch was
  added.

## Risks / Trade-offs

- [A page-private alias is dropped while the page still uses it] → both pages
  build and their scroll/group structure tests run in the same delivery; the
  undefined-token references found during this work (`--accent-color`,
  `--border-color`) were removed rather than left as silently ineffective
  declarations.
- [Two names for one token drift later] → the alias blocks are one line per
  token and the shared layer's header comment names itself as the single source;
  `AGENTS.md` records the rule for both pages.
- [Coalescing hides a final update] → debounced and frame-coalesced paths keep
  the pending update scheduled until it is applied, and cancellation on
  disposal is explicit.
- [Region guard drift between the imperative guard and Preact memoization] →
  both sides call the same `equalBySignature`, which is what the 24-case
  equivalence test locks.

## Migration Plan

Single delivery, no rollout flag: add the shared layer, adopt it in both page
documents and stylesheets, convert each panel to the scroll-ownership model,
move the back entries, bound the alias chips, and apply the comparison and
coalescing changes. Rollback is reverting the added `page-chrome.css` link and
the stylesheet/component diff; no persisted state or wire contract is touched,
so no data migration or compatibility path is required.

## Open Questions

None. The `src/shared/panelHeader.tsx` adoption question was resolved by
removing the module; see the CSS-contract decision above.
