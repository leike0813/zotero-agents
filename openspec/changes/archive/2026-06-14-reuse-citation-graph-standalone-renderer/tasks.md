## 1. OpenSpec

- [x] 1.1 Validate this change with OpenSpec strict mode.

## 2. Shared Renderer

- [x] 2.1 Add a shared Sigma-based citation graph renderer with `renderCitationGraph(container, model, options)`.
- [x] 2.2 Add renderer CSS and reusable graph model normalization helpers.
- [x] 2.3 Add build script to emit prebuilt standalone JS/CSS assets.

## 3. Literature Deep Reading

- [x] 3.1 Aggregate `citation_graph.model` from snapshot and layout views in Stage 40.
- [x] 3.2 Inline prebuilt graph JS/CSS assets into final HTML.
- [x] 3.3 Replace the SVG graph implementation in `deep-reading.js` with standalone renderer initialization.
- [x] 3.4 Regenerate `skills_builtin/literature-deep-reading`.

## 4. Workbench Alignment

- [x] 4.1 Reuse shared graph visual/model helpers from Workbench where practical.
- [x] 4.2 Keep Host action callbacks Workbench-owned and readonly callbacks export-owned.

## 5. Tests And Validation

- [x] 5.1 Add focused tests for render-ready graph model and inline bundle presence.
- [x] 5.2 Add readonly renderer test for absence of Host-only actions.
- [x] 5.3 Run focused literature deep-reading tests, renderer bundle build check, `npx tsc --noEmit`, Python compile, OpenSpec strict validate, targeted Prettier, and `git diff --check`.
