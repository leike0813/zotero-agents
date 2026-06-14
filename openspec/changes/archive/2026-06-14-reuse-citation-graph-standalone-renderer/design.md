# Design

## Context

The Workbench graph renderer currently lives inside `synthesisWorkbenchApp.ts` and uses `graphology + Sigma` with reducer-driven interaction. The deep-reading renderer uses static SVG. Both consume related graph data, but the visual logic is duplicated and inconsistent.

## Goals

- Use a Sigma-based standalone renderer in deep-reading final HTML.
- Keep Stage 40 execution Python-only.
- Keep generated HTML self-contained.
- Preserve Workbench graph visual semantics for hover, selection, labels, halo, and edge visibility.
- Avoid changing agent-facing payload schemas.

## Non-Goals

- Recompute graph layout in the browser.
- Add Host actions to readonly HTML attachments.
- Change Host Bridge graph APIs.
- Move all Workbench graph controls in one step if doing so would destabilize unrelated Workbench behavior.

## Decisions

### Build-Time Bundle

The standalone renderer is authored in TypeScript and bundled during repository build/package generation. The generated JS and CSS assets are copied into `skills_builtin/literature-deep-reading`.

At skill runtime, Python only reads these assets as text and inlines them into `result/deep-reading.html`.

### Renderer Contract

The shared renderer exposes `renderCitationGraph(container, model, options)`.

The normalized model contains:

- `nodes[]`: `id`, `title`, `kind`, `year`, `x`, `y`, `metrics`, `visibility`, `display_tier`, `low_signal`
- `edges[]`: `id`, `source`, `target`, `primary_role`, `mention_count`, `visibility`
- `selectedElement`
- `diagnostics`

`options.readonly` disables Host-only actions and renders selection details locally.

### Deep-Reading Integration

Stage 40 aggregates Host snapshot and layout into `citation_graph.model`. It only includes nodes with persisted layout coordinates. If layout is missing, the model is empty and the renderer shows an empty state.

The final HTML inlines:

- normal reader CSS/JS
- standalone citation graph bundle JS
- standalone citation graph CSS
- graph data inside the existing `deep-reading-data` JSON

### Workbench Integration

The first implementation extracts graph visual primitives and standalone rendering into shared source. Workbench can continue to own host commands and filter state, but any reusable graph styling/model logic should come from the shared renderer module. If full Workbench replacement requires a larger UI rewrite, keep that as a follow-up while preventing deep-reading from maintaining a divergent SVG renderer.

## Risks

- Bundle size may exceed target if too much Workbench code is pulled in. The build should report bundle size and fail or warn above 1 MB raw.
- Sigma may not render in some restricted HTML viewers. The HTML should show a readable empty/error state if WebGL/canvas initialization fails.
- Old generated HTML will not change until rerendered.
