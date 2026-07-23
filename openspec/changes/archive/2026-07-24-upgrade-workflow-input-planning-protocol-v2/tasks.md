## 1. Manifest v2 contracts

- [x] 1.1 Add table-driven schema and loader tests for required v2 fields, removed v1 fields, count satisfiability, and compatibility matrices
- [x] 1.2 Replace workflow manifest input/validation types and JSON Schema with the explicit v2 tagged contracts
- [x] 1.3 Implement semantic loader validation for triggers, counts, selectors, member acceptance, filters, and grouping

## 2. Central input planner

- [x] 2.1 Add planner contract tests for one-time selection validation, post-filter candidate counts, all member kinds, ordering, grouping, orphan skips, and context merging
- [x] 2.2 Implement `workflowInputPlanning.ts` with requirements, selectors, compatibility, MIME acceptance, ordered filters, grouping, immutability, and separated statistics
- [x] 2.3 Remove `workflowSelectionValidation.ts` and duplicate runtime selection, MIME, per-parent, and unit-splitting logic

## 3. Execution and queue seams

- [x] 3.1 Update preparation contracts and seams so request build/preflight consume prepared units without replanning and preflight expansion retains one top-level slot
- [x] 3.2 Update workflow execution summaries to separate candidate skips, unit skips, successes, and failures
- [x] 3.3 Make duplicate confirmation and Host queue identity indexes atomic across every immutable group member while keeping snapshots redacted
- [x] 3.4 Add regression coverage for global selection requirements, grouped duplicate handling, queue member indexes, and post-admission immutability

## 4. UI and Host Bridge consumers

- [x] 4.1 Make settings preview rows and concurrency visibility derive from prepared top-level unit count
- [x] 4.2 Project `inputs` and `validateSelection` separately through Host Bridge list/describe/validate/apply-readiness
- [x] 4.3 Build each allowed Zotero-managed prepared unit inside the existing Host Bridge batch without reconstructing raw selection

## 5. Workflow and content migration

- [x] 5.1 Migrate every built-in, package, debug, fixture, and inline test workflow manifest to schema version 2
- [x] 5.2 Preserve literature-source, MinerU, generated-note, digest-target, child, and no-selection observable behavior in migration tests
- [x] 5.3 Raise the supported content API and package metadata to `3.0.0` without publishing

## 6. Documentation and generated help

- [x] 6.1 Update component and site workflow documentation to distinguish the inputs consumer contract from validation candidate production
- [x] 6.2 Update localized workflow documentation and regenerate embedded help through the repository command

## 7. Verification

- [x] 7.1 Run focused loader, planner, seam, queue, Host Bridge, and UI tests
- [x] 7.2 Run built-in manifest, node core/UI/workflow, TypeScript, lint/format, docs, SSOT, localization, and build checks
  - The focused, UI, workflow, TypeScript, lint/format, documentation, SSOT, localization, and build gates pass.
  - The full core run completes with 2737 passing, 62 pending, and five out-of-scope baseline failures: two Kilo reasoning assertions, one missing archived Host Bridge semantic-parity artifact, one model-catalog normalization assertion, and the unchanged runtime-diagnostics replay-elision marker check.
- [x] 7.3 Strictly validate this v2 change and `add-native-workflow-queue-management`, documenting any external blocker
  - The v2 change passes strict validation. The queue change is already archived, so OpenSpec no longer resolves its active change name; its current `workflow-host-queue-management` main spec passes strict validation.
