# Tasks

## 1. Contracts

- [x] Add OpenSpec proposal, design, tasks, and delta spec.
- [x] Validate `fix-synthesis-citation-graph-and-ui` with OpenSpec.

## 2. Graph Core

- [x] Add tests for citekey promotion, author-field identity, external merge,
      raw unresolved merge, dropped empty references, and 36-paper node-count
      regression.
- [x] Implement stable reference identity and graph diagnostics.
- [x] Adapt Zotero references payload extraction to existing author/raw/citekey
      fields.

## 3. Service And UI Model

- [x] Add tests for persisted graph/layout snapshot reads in Workbench state.
- [x] Add graph filter state for node kind, role, unresolved visibility, and
      selected node/edge details.
- [x] Add Workbench rebuild graph host command.

## 4. Graph UI

- [x] Add Sigma.js dependency and bundled Workbench frontend entry.
- [x] Replace the primary Graph tab renderer with Sigma.js/WebGL.
- [x] Add search focus, hover neighbor highlight, click details, filters, and
      layout preset switching.

## 5. Verification

- [x] Run targeted citation graph/UI tests.
- [x] Run `npm run check:builtin-workflow-manifest`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npx openspec validate fix-synthesis-citation-graph-and-ui --strict`.
