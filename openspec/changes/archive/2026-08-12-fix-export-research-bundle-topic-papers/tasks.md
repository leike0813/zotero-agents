## 1. Topic Discovery Tests

- [x] 1.1 Convert the existing Stage 40 Topic-context fixture to semantic `source_papers` envelopes and add the empty-saved-snapshot/current-source-paper regression.
- [x] 1.2 Add table-driven coverage for unavailable, missing, malformed, empty, and partially invalid Topic source tables, including ready-with-diagnostics and incomplete-zero-candidate outcomes.
- [x] 1.3 Extend the existing Synthesis integration test to lock `semantic.source_papers` as current artifact data independent from the saved resolved-paper snapshot.

## 2. Topic Discovery Runtime

- [x] 2.1 Change Stage 40 to request semantic Topic context and normalize canonical refs only from `semantic.source_papers`.
- [x] 2.2 Preserve valid Topic candidates, execute metadata fallback for degraded Topics, and derive `ready`, `empty_confirmed`, or `incomplete` without false empty confirmation.
- [x] 2.3 Persist stable Topic-scoped source-table diagnostics and counts through the existing discovery summary, stage result, gate, and action-receipt path.

## 3. Current-State Guidance

- [x] 3.1 Update the built-in Skill and Stage 40 gate guidance to describe current Topic source papers, degraded discovery, and recovery.
- [x] 3.2 Update the workflow README without changing generated help docs or the final Research Bundle contract.

## 4. Validation

- [x] 4.1 Run the focused Research Bundle runtime and Synthesis integration tests and fix attributable regressions.
- [x] 4.2 Run built-in workflow/SSOT checks and TypeScript static checking relevant to the changed surfaces.
- [x] 4.3 Validate the OpenSpec change in strict mode and review the final diff for scope and current-state consistency.
