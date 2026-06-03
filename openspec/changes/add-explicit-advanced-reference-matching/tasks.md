## 1. OpenSpec and Docs

- [x] 1.1 Add delta specs for matcher semantics, proposal/fact state, Workbench UI, progress, MCP/debug, performance, invariants, and docs.
- [x] 1.2 Update active Synthesis docs to distinguish lightweight binding from explicit advanced matching.
- [x] 1.3 Validate the change with strict OpenSpec validation.

## 2. Repository and Model

- [x] 2.1 Add `synt_reference_match_proposal` schema, indexes, memory adapter support, mappers, and repository APIs.
- [x] 2.2 Treat `synt_reference_binding` as accepted facts only for new writes.
- [x] 2.3 Add helpers to list unbound active canonical references and preserve rejected proposals by basis.

## 3. Service and Commands

- [x] 3.1 Add `runAdvancedReferenceMatchingNow` and `retryAdvancedReferenceMatching`.
- [x] 3.2 Add `applyReferenceMatchProposalAction`.
- [x] 3.3 Ensure advanced matching builds the matcher index once per operation and reports progress through `synt_operation`.
- [x] 3.4 Ensure accepted facts mark citation graph cache stale without rebuilding graph cache.
- [x] 3.5 Add static guards so refresh/apply do not call the heavy matcher or write proposals.

## 4. Workbench and Host Surface

- [x] 4.1 Add host/UI commands and labels for advanced matching and proposal actions.
- [x] 4.2 Add Index Advanced Matching / Review subview with proposal filters and Accept/Reject actions.
- [x] 4.3 Keep Index fact views separate from proposal state.

## 5. Tests and Validation

- [x] 5.1 Add repository tests for proposal insert/list/action behavior.
- [x] 5.2 Add service tests for auto-accepted high-confidence results, open proposals, rejected suppression, and graph cache stale marking.
- [x] 5.3 Add Workbench/UI tests for command wiring and proposal review view.
- [x] 5.4 Run TypeScript, targeted core tests, build, and OpenSpec validation.
