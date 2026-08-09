## 1. Contracts and failing tests

- [x] 1.1 Add delta specs and record the fixed Host Bridge baseline, materialized metrics, empty deletion inventory, and required zero-count handoff.
- [x] 1.2 Extend Registry and paper-artifact API tests for four-artifact defaults, explicit filters, score decode errors, full score export, remote download, coverage, facets, and hashes; confirm the new assertions fail.
- [x] 1.3 Extend Index, Topic, Research Bundle, and Manuscript tests for the new fields, formulas, boundaries, freshness, routing, and frozen inventory; confirm the new assertions fail.

## 2. Shared paper-artifact and quality contracts

- [x] 2.1 Replace the sidecar-only type with `PaperArtifactType` and one four-item constant used by payload maps, defaults, Registry coverage, facets, diagnostics, and row hashes.
- [x] 2.2 Add the shared `literature_quality` snapshot, payload hash, quality-prior formula, and missing/invalid diagnostics.
- [x] 2.3 Make manifest/read/export default to four artifacts, preserve explicit filtering, export full score JSON, and publish manifest schema `1.1.0`.

## 3. Workbench Index

- [x] 3.1 Project four-artifact state and derive Analyze full/score-only/disabled behavior without `literatureAnalysisMode` in the Index DTO.
- [x] 3.2 Add the literature-score artifact icon, four-column layout, separate Rating stars, stable row signature, and Index/Topics/Home-only score-note invalidation.

## 4. Research workflows

- [x] 4.1 Update Topic Stage 20/30 contracts and runtime to remove subjective paper quality, enforce relevance sets, apply the four-component formula, persist `literature_quality` and `context_selection_score`, and bump schemas.
- [x] 4.2 Add score-specific Topic dependency freshness and full-update reasons, render all four Topic Skills, and verify generated parity.
- [x] 4.3 Update Research Bundle threshold-first selection, graph/no-graph formulas, neutral fallback diagnostics, four-artifact manifest state, stable ordering, `selection_score`, and schema `2.0.0`.
- [x] 4.4 Persist Manuscript Stage 2 evidence inventory `1.0.0` with quality snapshots, evidence roles, reasons, and caveats; require later stages to use the frozen inventory without ranking or hard filtering.

## 5. Governed Skills, docs, and generated surfaces

- [x] 5.1 Update current-state-only Topic, Research Bundle, Manuscript, workflow README, MCP/Topic docs, and relevant independent Synthesis UI template sources.
- [x] 5.2 Complete Host Bridge semantic review against the fixed baseline and update only required semantic sources with no instruction deletion or thinning.
- [x] 5.3 Run unified Topic/Host Bridge renderers and refresh generated addon, command-card, Profile, documentation, and review-mirror surfaces.

## 6. Verification

- [x] 6.1 Run focused Mocha/workflow/UI tests and fix regressions.
- [x] 6.2 Run TypeScript, sidebar typecheck, builtin workflow manifest, formatting, lint, renderer-drift, and strict OpenSpec validation.
- [x] 6.3 Run Host Bridge surface, package, review-mirror, and baseline-relative gates; report zero unmapped, downgraded, unauthorized-dropped, and intra-package-duplicate semantic units and dispose all instruction-depth warnings.
