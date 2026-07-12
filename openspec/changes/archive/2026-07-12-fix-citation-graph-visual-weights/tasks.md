## 1. Metric and projection correctness

- [x] 1.1 Exclude graph-centrality terms from isolated-node foundation and frontier scores, and version the metric output.
- [x] 1.2 Preserve formal incoming and outgoing metrics while mapping persisted graph nodes to the Workbench UI.
- [x] 1.3 Bump the citation graph cache-policy version so prior metric semantics rebuild through the existing stale-cache path.

## 2. Shared visual weighting

- [x] 2.1 Add shared fallback-degree, logarithmic importance, halo, and size rules to the citation graph visual-rules module.
- [x] 2.2 Replace the Workbench's duplicated visual-weight helpers and detail-panel fallback lookup with shared rules over visible nodes and edges.
- [x] 2.3 Replace the standalone renderer's duplicated visual-weight helpers with the same shared rules.

## 3. Regression coverage and verification

- [x] 3.1 Cover isolated composite scores and Workbench metric projection with core tests.
- [x] 3.2 Add pure visual-rule coverage for metric precedence, visible-edge filtering, mention weighting, and continuous single-degree sizing.
- [x] 3.3 Update the renderer structural guard for the shared-rule boundary and run core tests, type checking, formatting, linting, and the production build.
