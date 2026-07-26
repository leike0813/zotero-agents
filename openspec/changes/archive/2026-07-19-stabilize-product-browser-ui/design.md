## Context

Dashboard Products uses snapshot-driven rendering. Selection changes are legitimate content changes, so the Products surface is rebuilt, but the renderer currently preserves scroll only for other Dashboard surfaces. The product tree already owns expansion state in the browser, while its initialization eagerly expands every folder. Separately, the Research Bundle README generator emits a seven-column paper header with a six-cell delimiter row; the shared Markdown renderer correctly rejects that malformed table.

The change must remain page-local, keep snapshot and persistence contracts unchanged, and avoid broad tolerance rules in the shared Markdown renderer.

## Goals / Non-Goals

**Goals:**

- Preserve the Products list, filtered Skill Feedback list, and product file-tree scroll positions across selection-driven renders.
- Isolate file-tree scroll and expansion state by product owner.
- Start every product folder collapsed on first display.
- Emit valid Markdown table syntax from the Research Bundle README generator.
- Cover the user-visible behavior with browser and workflow tests.

**Non-Goals:**

- Persist browsing state across Dashboard page lifecycles or plugin restarts.
- Change Dashboard snapshot DTOs, backend state, or Product persistence.
- Repair existing exported Products or arbitrary malformed Markdown.
- Modify the shared Markdown renderer.

## Decisions

### Use one stable-key scroll registry in the Dashboard renderer

Scrollable Products regions receive `data-dashboard-scroll-key` values and share one page-local map. The renderer captures keyed nodes before clearing the selected surface and restores matching nodes after reconstruction. Keys are `products:list`, `feedback:list:<skillFilter>`, and `product:tree:<productId>` so content owners do not inherit unrelated positions. The collapsed Products rail has no scroll key, preventing its zero position from overwriting the expanded list state.

This reuses one mechanism instead of adding separate variables and restore branches for each region. Patching the existing Products DOM in place was considered, but it would be a larger renderer refactor than the selection-state defect requires.

### Represent first-use tree expansion with an empty owner set

Each product owns a `Set` of expanded folder paths. Creating an empty set makes collapsed folders the natural default; user actions update that same set, which survives later renders and product switches within the page. The previous initialized flag and recursive collect-all-folders pass are removed because they encode the opposite default and duplicate state.

### Correct the Markdown producer rather than tolerate malformed tables

The Research Bundle generator emits seven delimiter cells to match its seven paper-index columns. The shared renderer remains strict because it serves Dashboard previews, the Markdown Reader, Synthesis, and Assistant surfaces; guessing missing cells there could reinterpret ordinary pipe-delimited text and would conceal producer defects.

### Test observable DOM and generated syntax

A Playwright test drives real Dashboard snapshots and asserts scroll, default collapse, and per-product restoration. The existing Research Bundle workflow test asserts that the paper header and delimiter have the same seven-column structure. Tests avoid locking localized text, internal call order, or full rendered HTML.

## Risks / Trade-offs

- [A deleted product leaves page-local map entries until the Dashboard closes] → State is bounded by products viewed in one page lifecycle and is released with the page.
- [A filtered feedback list could inherit another filter's position] → Include the active skill filter in the stable owner key.
- [Existing malformed README files remain unrendered] → Keep historical Products immutable and require a new Research Bundle export for corrected output.

## Migration Plan

No data migration is required. Deploy the renderer and generator changes together; rollback restores the previous page-local behavior without affecting stored data. Existing Products and downloaded README files are not rewritten.

## Open Questions

None.
