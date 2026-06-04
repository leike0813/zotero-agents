## 1. OpenSpec and Docs

- [x] 1.1 Add change artifacts and delta specs for clustered dedupe and the external harness.
- [x] 1.2 Update active docs and the reference-resolution harness skill guidance.

## 2. Cluster Dedupe Algorithm

- [x] 2.1 Add clustered dedupe result types and `dedupeCanonicalReferencesClustered()`.
- [x] 2.2 Implement bounded edge generation, title-containment classification, connected components, representative selection, and actions.
- [x] 2.3 Add matcher tests for exact, identifier, typo, contained-noise, contained-extension-risk, and budget diagnostics.

## 3. Index Harness

- [x] 3.1 Add CLI/read-model/debug-DB modules under `tools/synthesis-index-harness`.
- [x] 3.2 Add static UI and HTTP API for Library, References, Canonicals, Cluster Runs, and Cluster Results.
- [x] 3.3 Add harness tests for DB safety, read model joins, debug persistence, and legacy-table guards.

## 4. Validation

- [x] 4.1 Run OpenSpec validation.
- [x] 4.2 Run TypeScript and targeted tests.
- [x] 4.3 Run build.

## 5. Representative Stability Follow-up

- [x] 5.1 Update the cluster dedupe design artifact, OpenSpec deltas, harness README, and active synthesis docs with title-candidate aggregation, quality-first representative selection, sticky representative, and conservative retarget semantics.
- [x] 5.2 Extend clustered dedupe inputs and harness snapshots with title candidates, effective-canonical raw aggregation, and sticky representative evidence.
- [x] 5.3 Change representative selection so noisy raw-count-heavy titles cannot dominate clean/stable titles, while all redirect actions still target the final cluster representative.
- [x] 5.4 Update harness Cluster Results to show representative rationale and title-candidate provenance.
- [x] 5.5 Add regression coverage for quality-first representative selection, sticky representatives, and title-candidate harness inputs.

## 6. Structured Bibliographic Classifier and Eligibility Filter

- [x] 6.1 Replace venue-list-driven contained-title classification with structured bibliographic suffix signals and a small core marker set.
- [x] 6.2 Add canonical eligibility (`eligible | weak | excluded`) and diagnostics so invalid or low-quality inputs do not enter ordinary cluster matching.
- [x] 6.3 Align representative quality with structured noise evidence instead of duplicated hard-coded suffix regexes.
- [x] 6.4 Show eligibility and filter reasons in the harness Canonicals and Cluster Results views.
- [x] 6.5 Update the algorithm design artifact, OpenSpec specs, harness README, and active synthesis docs.
- [x] 6.6 Add regression coverage for SECOND, Gold-YOLO, DOI/URL junk filtering, unknown venue behavior, and extension-risk preservation.
