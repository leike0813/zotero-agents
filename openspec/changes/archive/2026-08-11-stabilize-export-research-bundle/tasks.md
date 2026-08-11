## 1. Candidate Discovery Tests

- [x] 1.1 Extend the existing Research Bundle runtime tests with structured primary/fallback anchor payloads and pageable library-list fixtures.
- [x] 1.2 Add table-driven coverage for ready, confirmed-empty, incomplete, malformed-row, unavailable-Topic, truncation, and post-assessment cancellation outcomes.

## 2. Candidate Discovery Runtime

- [x] 2.1 Extend the Stage 10 query-plan schema and current-state Skill instructions with bounded metadata anchors and Agent/script responsibility boundaries.
- [x] 2.2 Implement pageable primary/fallback anchor discovery, strict source-specific paper-reference normalization, provenance, and candidate budgets in Stage 40.
- [x] 2.3 Persist the discovery summary and diagnostics, gate zero-packet Stage 50 on confirmed emptiness, and constrain Stage 70 business cancellation to evidence-backed states.
- [x] 2.4 Correct Stage 20/40 gate guidance and synchronize the Skill's executable scoring and recovery instructions.

## 3. Parameter Contract and UI

- [x] 3.1 Extend existing Workflow parameter tests for integer metadata, 10/50/200 maxima, unchanged defaults, manifest/Skill-schema parity, and UI boundary behavior.
- [x] 3.2 Add the shared browser number-field helper and wire both live Workflow forms to dynamic range labels and pre-submit/pre-save integer/range validation.
- [x] 3.3 Propagate the generic integer descriptor through Workflow types, schema, domain normalization, and settings models.
- [x] 3.4 Update the workflow manifest and Skill parameter schema, and load runtime defaults and bounds from the Skill schema while preserving non-UI clamping.

## 4. Documentation

- [x] 4.1 Update the workflow README and user documentation, including localized copies, with metadata-search scope, enlarged optional limits, and the non-Topic meaning of `maxRelatedPapers`.
- [x] 4.2 Confirm generated help docs remain untouched and current-state Skill instructions contain no historical protocol commentary or duplicated stage rules.

## 5. Validation

- [x] 5.1 Run the focused runtime, workflow-package, settings-domain, and UI tests; fix all regressions attributable to this change.
- [x] 5.2 Run TypeScript/lint, localization/help-doc governance, Skill validation, and strict OpenSpec validation; record unrelated pre-existing failures separately.
