## 1. Projection regression coverage

- [x] 1.1 Add a DB-backed regression fixture proving repeated references from one source remain degree-one, hover-only, aggregated, and absent from layout.
- [x] 1.2 Add a DB-backed regression fixture proving two distinct sources promote the external target while repeated same-source evidence only increases edge mentions.

## 2. Citation graph projection

- [x] 2.1 Centralize deterministic source-target edge aggregation and reuse it in canonical and DB-backed graph construction.
- [x] 2.2 Classify external targets and graph diagnostics from distinct source-target pairs before layout input is built.

## 3. Renderer lifecycle regression coverage

- [x] 3.1 Extend Workbench structural contracts to require a persistent Graph region and prohibit routine Sigma teardown.
- [x] 3.2 Extend browser interaction coverage for sidebar, selection, tab, model, and resize updates while preserving canvas and WebGL context identity.

## 4. Persistent Graph renderer

- [x] 4.1 Refactor the Workbench shell and Graph surface to keep one mounted Sigma stage across routine region and tab updates.
- [x] 4.2 Update renderer models with `setGraph()`, make reducers and handlers read live state, and preserve camera for non-layout changes.
- [x] 4.3 Replace multi-round resize scheduling with one cancellable coalesced RAF and defer hidden-surface resize work.

## 5. Documentation and generated surfaces

- [x] 5.1 Document distinct-source degree, aggregated read-model edges, persistent WebGL ownership, and resize constraints.
- [x] 5.2 Regenerate and verify the literature-deep-reading Citation Graph JS/CSS templates from canonical sources.

## 6. Verification

- [x] 6.1 Run focused Citation Graph and UI stability tests, browser visual interaction coverage, type checking, and scoped formatting/lint checks.
- [x] 6.2 Validate the OpenSpec change strictly and confirm no unrelated worktree changes were modified.
