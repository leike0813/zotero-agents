## 1. Red Tests

- [x] 1.1 Update Workbench tests to require `client.topics.getTopicReport` inside the Topic Report export helper while preserving its validation and export behavior.
- [x] 1.2 Update service-boundary tests to forbid the direct Workbench legacy report call while retaining 125 public service methods, four direct consumers, and the existing client contract.

## 2. Workbench Consumer Migration

- [x] 2.1 Route Topic Report export through the lazily resolved default Synthesis client and existing topics capability.
- [x] 2.2 Preserve report title and Markdown handling, unavailable-body failure, file-picker cancellation, safe filename, trailing newline, runtime write, command single-flight, and error reporting.

## 3. Documentation and Validation

- [x] 3.1 Update current-state Synthesis README, runtime/rebuild, and Workbench host documentation for the migrated report read and remaining legacy scope.
- [x] 3.2 Run contract/root typechecks, focused Workbench/report/boundary/client tests, read-only UI harness, service-boundary and Synthesis invariant checks, targeted formatting/lint, and production build.
- [x] 3.3 Run strict OpenSpec validation and confirm all implementation tasks are complete.
